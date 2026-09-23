package com.studyos.app.blocker;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.LinkProperties;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.VpnService;
import android.os.Build;
import android.os.ParcelFileDescriptor;

import androidx.core.app.NotificationCompat;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * A DNS-only local VPN. Android sends DNS packets for TUN_ADDR through the
 * tunnel; this service either returns NXDOMAIN or proxies the DNS response.
 *
 * Only TUN_ADDR is routed into the VPN. Routing 0.0.0.0/0 without a complete
 * IP forwarder blackholes all normal app traffic, which is why the previous
 * socket-based implementation could not block sites reliably.
 */
public class BlockVpnService extends VpnService {
    public static final String ACTION_START = "studyos.blocker.vpn.START";
    public static final String ACTION_STOP = "studyos.blocker.vpn.STOP";

    private static final String TUN_ADDR = "10.32.0.2";
    private static final String[] FALLBACK_DNS = {"1.1.1.1", "8.8.8.8", "9.9.9.9"};
    private static final String CHANNEL_ID = "studyos_website_blocker";
    private static final int NOTIFICATION_ID = 1002;
    private static final AtomicBoolean running = new AtomicBoolean(false);

    private ParcelFileDescriptor tunFd;
    private Thread thread;
    private volatile boolean stopThread;
    private volatile Network upstreamNetwork;

    public static boolean isRunning(Context ctx) { return running.get(); }
    public static Intent prepare(Context ctx) { return VpnService.prepare(ctx); }

    public static void start(Context ctx) {
        try {
            Intent intent = new Intent(ctx, BlockVpnService.class).setAction(ACTION_START);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) ctx.startForegroundService(intent);
            else ctx.startService(intent);
        }
        catch (Exception ignored) { }
    }

    public static void stop(Context ctx) {
        try { ctx.startService(new Intent(ctx, BlockVpnService.class).setAction(ACTION_STOP)); }
        catch (Exception ignored) { }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "StudyOS Website Blocker", NotificationManager.IMPORTANCE_LOW);
            channel.setShowBadge(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            stopInternal();
            return START_NOT_STICKY;
        }
        startForeground(NOTIFICATION_ID, new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setContentTitle("StudyOS Website Blocker")
                .setContentText("Filtering blocked websites")
                .setOngoing(true)
                .build());
        startInternal();
        return START_STICKY;
    }

    private synchronized void startInternal() {
        if (running.get()) return;
        try {
            Builder builder = new Builder();
            builder.setSession("StudyOS Website Blocker");
            builder.addAddress(TUN_ADDR, 32);
            builder.addDnsServer(TUN_ADDR);
            // Capture only DNS directed at our virtual resolver, not all traffic.
            builder.addRoute(TUN_ADDR, 32);
            builder.setBlocking(true);
            tunFd = builder.establish();
            if (tunFd == null) return;

            stopThread = false;
            running.set(true);
            thread = new Thread(this::packetLoop, "studyos-dns-vpn");
            thread.start();
        } catch (Exception ignored) {
            stopInternal();
        }
    }

    private synchronized void stopInternal() {
        stopThread = true;
        running.set(false);
        if (thread != null) {
            thread.interrupt();
            thread = null;
        }
        if (tunFd != null) {
            try { tunFd.close(); } catch (Exception ignored) { }
            tunFd = null;
        }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopInternal();
        stopForeground(true);
        super.onDestroy();
    }

    private void packetLoop() {
        try (FileInputStream input = new FileInputStream(tunFd.getFileDescriptor());
             FileOutputStream output = new FileOutputStream(tunFd.getFileDescriptor())) {
            byte[] packet = new byte[32767];
            while (!stopThread) {
                int length = input.read(packet);
                if (length > 0) handlePacket(packet, length, output);
            }
        } catch (Exception ignored) {
            // Closing the VPN descriptor during shutdown reaches here as expected.
        } finally {
            running.set(false);
        }
    }

    private void handlePacket(byte[] packet, int length, FileOutputStream output) throws Exception {
        // IPv4 + UDP + destination port 53 only.
        if (length < 28 || (packet[0] >> 4) != 4 || (packet[9] & 0xFF) != 17) return;
        int ipHeaderLength = (packet[0] & 0x0F) * 4;
        if (ipHeaderLength < 20 || length < ipHeaderLength + 8) return;
        int udpLength = readU16(packet, ipHeaderLength + 4);
        if (udpLength < 8 || ipHeaderLength + udpLength > length) return;
        if (readU16(packet, ipHeaderLength + 2) != 53) return;

        byte[] query = Arrays.copyOfRange(packet, ipHeaderLength + 8, ipHeaderLength + udpLength);
        String domain = DnsParser.readName(query, query.length);
        byte[] response = isBlocked(domain, BlockerPrefs.dnsDomains(this))
                ? DnsParser.blockedResponse(query)
                : forward(query);
        if (response == null || response.length == 0) return;

        byte[] reply = buildUdpReply(packet, ipHeaderLength, response);
        synchronized (output) {
            output.write(reply);
            output.flush();
        }
    }

    private byte[] forward(byte[] query) {
        // Public DNS addresses can be blocked by a network. Prefer the DNS
        // resolver supplied by the active Wi-Fi/mobile network, then fall back.
        for (InetAddress resolver : upstreamResolvers()) {
            try (DatagramSocket upstream = new DatagramSocket()) {
                // Explicitly select the physical Wi-Fi/mobile network. Merely
                // calling protect() can still leave a socket without a usable
                // resolver route on some Android VPN implementations.
                Network network = upstreamNetwork;
                if (network != null) network.bindSocket(upstream);
                protect(upstream);
                upstream.connect(new InetSocketAddress(resolver, 53));
                upstream.setSoTimeout(1500);
                upstream.send(new DatagramPacket(query, query.length));
                DatagramPacket reply = new DatagramPacket(new byte[32767], 32767);
                upstream.receive(reply);
                return Arrays.copyOf(reply.getData(), reply.getLength());
            } catch (Exception ignored) {
                // Try the next resolver rather than taking all websites offline.
            }
        }
        return null;
    }

    private List<InetAddress> upstreamResolvers() {
        LinkedHashSet<InetAddress> resolvers = new LinkedHashSet<>();
        try {
            ConnectivityManager cm = getSystemService(ConnectivityManager.class);
            if (cm != null) {
                Network active = Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                        ? cm.getActiveNetwork() : null;
                NetworkCapabilities activeCaps = active == null
                        ? null : cm.getNetworkCapabilities(active);
                if (active != null && activeCaps != null
                        && !activeCaps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) {
                    upstreamNetwork = active;
                    LinkProperties properties = cm.getLinkProperties(active);
                    if (properties != null) resolvers.addAll(properties.getDnsServers());
                }
                for (Network network : cm.getAllNetworks()) {
                    NetworkCapabilities caps = cm.getNetworkCapabilities(network);
                    if (caps == null || caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN)) continue;
                    if (upstreamNetwork == null) upstreamNetwork = network;
                    LinkProperties properties = cm.getLinkProperties(network);
                    if (properties != null) resolvers.addAll(properties.getDnsServers());
                }
            }
        } catch (Exception ignored) {
        }
        try {
            for (String fallback : FALLBACK_DNS) resolvers.add(InetAddress.getByName(fallback));
        } catch (Exception ignored) {
        }
        // Never send a request back to the virtual VPN resolver.
        resolvers.removeIf(address -> TUN_ADDR.equals(address.getHostAddress()));
        return new ArrayList<>(resolvers);
    }

    private boolean isBlocked(String domain, List<String> blocked) {
        String dn = domain == null ? "" : domain.trim().toLowerCase(Locale.US);
        if (dn.isEmpty()) return false;
        for (String b : blocked) {
            String bn = b.trim().toLowerCase(Locale.US);
            if (!bn.isEmpty() && (dn.equals(bn) || dn.endsWith("." + bn))) return true;
        }
        return false;
    }

    private byte[] buildUdpReply(byte[] request, int requestHeaderLength, byte[] dns) {
        int length = 20 + 8 + dns.length;
        byte[] reply = new byte[length];
        reply[0] = 0x45; // IPv4, 20-byte header
        writeU16(reply, 2, length);
        reply[4] = request[4];
        reply[5] = request[5];
        reply[8] = 64;
        reply[9] = 17; // UDP
        // Source/destination addresses and ports are reversed from the query.
        System.arraycopy(request, 16, reply, 12, 4);
        System.arraycopy(request, 12, reply, 16, 4);
        writeU16(reply, 20, readU16(request, requestHeaderLength + 2));
        writeU16(reply, 22, readU16(request, requestHeaderLength));
        writeU16(reply, 24, 8 + dns.length);
        // A zero UDP checksum is valid for IPv4 and avoids a second checksum pass.
        System.arraycopy(dns, 0, reply, 28, dns.length);
        writeU16(reply, 10, ipv4Checksum(reply, 0, 20));
        return reply;
    }

    private static int readU16(byte[] data, int offset) {
        return ((data[offset] & 0xFF) << 8) | (data[offset + 1] & 0xFF);
    }

    private static void writeU16(byte[] data, int offset, int value) {
        data[offset] = (byte) (value >>> 8);
        data[offset + 1] = (byte) value;
    }

    private static int ipv4Checksum(byte[] data, int offset, int length) {
        int sum = 0;
        for (int i = offset; i < offset + length; i += 2) {
            sum += readU16(data, i);
            sum = (sum & 0xFFFF) + (sum >>> 16);
        }
        return (~sum) & 0xFFFF;
    }
}
