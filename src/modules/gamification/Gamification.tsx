import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CircularProgress } from "@/components/ui/Progress";
import { readJSON, writeJSON } from "@/utils";

type Achievement = {
  id: string;
  title: string;
  desc?: string;
  unlocked: boolean;
  unlockedAt?: string;
};
type Challenge = {
  id: string;
  title: string;
  desc?: string;
  rewardXP: number;
  rewardCoins: number;
  completed?: boolean;
};

const STORAGE_KEY = "studyos_gamification_v1";

function defaultState() {
  return {
    xp: 0,
    level: 1,
    coins: 0,
    streak: 0,
    lastDaily: null as string | null,
    achievements: [
      {
        id: "ach_first_xp",
        title: "First XP",
        desc: "Earn your first XP",
        unlocked: false,
      },
      {
        id: "ach_week_streak",
        title: "7-day Streak",
        desc: "Maintain 7-day streak",
        unlocked: false,
      },
    ] as Achievement[],
    challenges: [
      {
        id: "ch_complete_lecture",
        title: "Finish Lecture",
        desc: "Mark a lecture complete",
        rewardXP: 50,
        rewardCoins: 10,
        completed: false,
      },
    ] as Challenge[],
    themesUnlocked: ["default"] as string[],
  };
}

function levelThreshold(level: number) {
  return level * level * 100; // simple curve
}

export function Gamification() {
  const [state, setState] = useState(() =>
    readJSON(STORAGE_KEY, defaultState()),
  );
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    writeJSON(STORAGE_KEY, state);
  }, [state]);

  function addXP(amount: number) {
    setState((prev) => {
      let xp = prev.xp + amount;
      let level = prev.level;
      let coins = prev.coins;
      let justLeveled = false;
      while (xp >= levelThreshold(level)) {
        xp -= levelThreshold(level);
        level += 1;
        coins += 50; // level up bonus
        justLeveled = true;
      }
      const achievements = prev.achievements.map((a) =>
        a.unlocked
          ? a
          : a.id === "ach_first_xp" && xp > 0
            ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
            : a,
      );
      if (justLeveled) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2200);
      }
      return { ...prev, xp, level, coins, achievements };
    });
  }

  function addCoins(amount: number) {
    setState((p) => ({ ...p, coins: p.coins + amount }));
  }

  function claimDaily() {
    const today = new Date().toISOString().slice(0, 10);
    if (state.lastDaily === today) return; // already claimed
    setState((p) => ({
      ...p,
      lastDaily: today,
      streak:
        p.lastDaily ===
        new Date(Date.now() - 86400000).toISOString().slice(0, 10)
          ? p.streak + 1
          : 1,
      coins: p.coins + 20,
    }));
    addXP(30);
  }

  function completeChallenge(id: string) {
    setState((p) => {
      const challenges = p.challenges.map((c) =>
        c.id === id && !c.completed ? { ...c, completed: true } : c,
      );
      const ch = p.challenges.find((c) => c.id === id);
      const xp = ch && !ch.completed ? ch.rewardXP : 0;
      const coins = ch && !ch.completed ? ch.rewardCoins : 0;
      if (xp) setTimeout(() => addXP(xp), 50);
      if (coins) setTimeout(() => addCoins(coins), 50);
      return { ...p, challenges };
    });
  }

  function unlockTheme(name: string, cost = 100) {
    if (state.coins < cost || state.themesUnlocked.includes(name)) return;
    setState((p) => ({
      ...p,
      coins: p.coins - cost,
      themesUnlocked: [...p.themesUnlocked, name],
    }));
  }

  function resetProgress() {
    setState(defaultState());
  }

  const percent = Math.round((state.xp / levelThreshold(state.level)) * 100);

  return (
    <div className="space-y-6">
      <Card padding="lg" className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Gamification</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Levels, coins, achievements, streaks, daily rewards, challenges,
            themes and animations.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-sm text-[var(--color-text-muted)]">Coins</div>
            <div className="text-2xl font-bold">{state.coins}</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-[var(--color-text-muted)]">Level</div>
            <div className="text-2xl font-bold">{state.level}</div>
          </div>
          <CircularProgress value={percent} size={72} strokeWidth={6}>
            <div className="text-xs">{percent}%</div>
          </CircularProgress>
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Daily Rewards & Streak</h4>
          <p className="text-xs text-[var(--color-text-muted)]">
            Streak: {state.streak} days • Last: {state.lastDaily || "never"}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="primary" onClick={claimDaily}>
              Claim Daily (+20 coins, +30 XP)
            </Button>
            <Button variant="secondary" onClick={() => addXP(10)}>
              Add 10 XP
            </Button>
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Achievements</h4>
          <div className="mt-3 space-y-2">
            {state.achievements.map((a) => (
              <div
                key={a.id}
                className={`flex items-center justify-between p-2 rounded ${a.unlocked ? "bg-green-600/10" : "bg-white/5"}`}
              >
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {a.desc}
                  </div>
                </div>
                <div>{a.unlocked ? "Unlocked" : "Locked"}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Challenges & Rewards</h4>
          <div className="mt-3 space-y-2">
            {state.challenges.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded bg-white/5"
              >
                <div>
                  <div className="font-medium">{c.title}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {c.desc}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-sm">{c.rewardXP} XP</div>
                  <Button
                    size="sm"
                    variant={c.completed ? "ghost" : "primary"}
                    onClick={() => completeChallenge(c.id)}
                    disabled={c.completed}
                  >
                    {c.completed ? "Done" : "Complete"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card padding="md">
          <h4 className="font-semibold">Unlock Themes</h4>
          <div className="mt-3 flex items-center gap-3">
            <div className="p-3 rounded shadow-sm bg-white/5">Default</div>
            <div
              className="p-3 rounded shadow-sm bg-white/5 cursor-pointer"
              onClick={() => unlockTheme("midnight", 100)}
            >
              Midnight (100 coins)
            </div>
            <div
              className="p-3 rounded shadow-sm bg-white/5 cursor-pointer"
              onClick={() => unlockTheme("sunrise", 150)}
            >
              Sunrise (150 coins)
            </div>
          </div>
          <div className="mt-3 text-xs text-[var(--color-text-muted)]">
            Unlocked: {state.themesUnlocked.join(", ")}
          </div>
        </Card>

        <Card padding="md">
          <h4 className="font-semibold">Admin / Debug</h4>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="danger" onClick={resetProgress}>
              Reset Progress
            </Button>
            <Button variant="secondary" onClick={() => addCoins(50)}>
              Add 50 Coins
            </Button>
          </div>
        </Card>
      </div>

      {showConfetti && (
        <div className="fixed left-1/2 top-20 -translate-x-1/2 z-50 pointer-events-none">
          <div className="text-4xl animate-bounce">🎉 Level Up!</div>
        </div>
      )}
    </div>
  );
}

export default Gamification;
