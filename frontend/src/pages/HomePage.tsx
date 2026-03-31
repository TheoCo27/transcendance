import { useState } from "react";

export default function HomePage() {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  return (
    <main className="flex flex-1 px-[10%] py-6">
      <div className="flex w-full gap-6">
        <div className="flex h-[90vh] flex-1 flex-col gap-6">
          <div className="flex h-[56vh] flex-col rounded-2xl border border-white/10 bg-surface px-8 py-6">
            <div className="flex flex-1 items-center justify-center">
              <p className="m-0 text-center text-3xl font-semibold text-text">
                Question ?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                className={[
                  "h-28 rounded-xl border text-base font-medium text-text transition",
                  selectedAnswer === 0
                    ? "border-primary bg-primary"
                    : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedAnswer(0)}
              >
                Reponse 1
              </button>
              <button
                className={[
                  "h-28 rounded-xl border text-base font-medium text-text transition",
                  selectedAnswer === 1
                    ? "border-primary bg-primary"
                    : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedAnswer(1)}
              >
                Reponse 2
              </button>
              <button
                className={[
                  "h-28 rounded-xl border text-base font-medium text-text transition",
                  selectedAnswer === 2
                    ? "border-primary bg-primary"
                    : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedAnswer(2)}
              >
                Reponse 3
              </button>
              <button
                className={[
                  "h-28 rounded-xl border text-base font-medium text-text transition",
                  selectedAnswer === 3
                    ? "border-primary bg-primary"
                    : "border-white/10 bg-background hover:border-primary hover:bg-primary/15",
                ].join(" ")}
                type="button"
                onClick={() => setSelectedAnswer(3)}
              >
                Reponse 4
              </button>
            </div>
          </div>
          <div className="flex h-[32vh] flex-col rounded-2xl border border-white/10 bg-surface px-8 py-6">
            <p className="mb-4 text-2xl font-semibold text-text">Chat</p>
            <div className="flex flex-1 flex-col gap-3 overflow-hidden">
              <div className="max-w-[75%] rounded-2xl bg-background px-4 py-3">
                <p className="m-0 text-sm text-text/70">Nom 2</p>
                <p className="m-0 text-base text-text">Tu as repondu quoi ?</p>
              </div>
              <div className="self-end rounded-2xl bg-primary px-4 py-3">
                <p className="m-0 text-base text-text">Je pense que c&apos;est la 3.</p>
              </div>
              <div className="max-w-[75%] rounded-2xl bg-background px-4 py-3">
                <p className="m-0 text-sm text-text/70">Nom 4</p>
                <p className="m-0 text-base text-text">On lance une autre manche apres ?</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-background px-4 py-3">
              <span className="flex-1 text-text/50">Ecrire un message...</span>
              <button
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-text"
                type="button"
              >
                Envoyer
              </button>
            </div>
          </div>
        </div>
        <aside className="h-[90vh] min-w-[200px] w-[20%] rounded-2xl border border-white/10 bg-surface px-6 py-6">
          <p className="mb-5 text-xl font-semibold text-text">Points</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Pseudo genre beaucoup trop long 1</span>
              <span>120</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 2</span>
              <span>110</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 3</span>
              <span>104</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 4</span>
              <span>98</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 5</span>
              <span>92</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 6</span>
              <span>87</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 7</span>
              <span>83</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 8</span>
              <span>79</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 9</span>
              <span>74</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-background px-4 py-3">
              <span className="min-w-0 truncate">Nom 10</span>
              <span>68</span>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
