package com.studyos.app.blocker;

/** Minimal DNS message helpers for the site-blocking VPN. */
public final class DnsParser {

    private DnsParser() {
    }

    /** Reads the QNAME (domain) from a DNS query. Header is 12 bytes. */
    public static String readName(byte[] msg, int length) {
        StringBuilder sb = new StringBuilder();
        int pos = 12;
        int jumps = 0;
        while (pos < length && jumps < 8) {
            int len = msg[pos] & 0xFF;
            if (len == 0) break;
            if ((len & 0xC0) == 0xC0) {
                if (pos + 1 >= length) break;
                pos = ((msg[pos] & 0x3F) << 8) | (msg[pos + 1] & 0xFF);
                jumps++;
                continue;
            }
            if (pos + 1 + len > length) break;
            if (sb.length() > 0) sb.append('.');
            for (int k = 0; k < len; k++) {
                sb.append((char) (msg[pos + 1 + k] & 0xFF));
            }
            pos += len + 1;
        }
        return sb.toString();
    }

    /**
     * Builds a NXDOMAIN response that echoes the query's question section.
     */
    public static byte[] blockedResponse(byte[] query) {
        int questionStart = 12;
        // Find end of the QNAME within the question.
        int pos = questionStart;
        int nameEnd = questionStart;
        while (pos < query.length) {
            int len = query[pos] & 0xFF;
            if (len == 0) {
                nameEnd = pos + 1;
                break;
            }
            pos += len + 1;
        }
        int questionEnd = nameEnd + 4; // qname + qtype + qclass
        if (nameEnd == questionStart || questionEnd > query.length) return new byte[0];
        byte[] resp = new byte[questionEnd];

        System.arraycopy(query, 0, resp, 0, questionEnd);

        // Flags: QR=1, opcode=0, AA=1, RD=1, RA=1, RCODE=3 (NXDOMAIN)
        resp[2] = (byte) 0x81;
        resp[3] = (byte) 0x83;
        // ANCOUNT, NSCOUNT and ARCOUNT are zero: this is a valid NXDOMAIN.
        return resp;
    }
}
