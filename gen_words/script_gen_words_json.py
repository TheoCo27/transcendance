import json
import unicodedata
import random

def normalize(word):
    word = unicodedata.normalize('NFD', word)
    word = ''.join(c for c in word if unicodedata.category(c) != 'Mn')
    word = ''.join(c for c in word if c.isalpha())
    return word.lower()

lengths = [5, 6, 7]

wordle = {l: [] for l in lengths}
wordle_compare = {l: [] for l in lengths}
anagram = {l: [] for l in lengths}

VOWELS = set("aeiouy")

with open("Lexique4.tsv", "r", encoding="utf-8") as f:
    header = f.readline().strip().split("\t")

    word_i = header.index("1_Mot")
    freq_i = header.index("10_FreqMot")
    cgram_i = header.index("5_Cgram")

    for line in f:
        cols = line.strip().split("\t")

        if len(cols) <= max(word_i, freq_i, cgram_i):
            continue

        word = cols[word_i]
        freq = float(cols[freq_i]) if cols[freq_i] else 0
        pos = cols[cgram_i]

        w = normalize(word)

        if len(w) not in lengths:
            continue

        if not w.isalpha():
            continue

        # filtres communs
        basic_ok = (
            freq > 0.5 and
            pos != "VER" and
            not w.endswith("s") and
            not w.endswith("ent") and
            not w.endswith("ant") and
            len(set(w)) > 2
        )

        # -------------------------
        # WORDLE_COMPARE
        # -------------------------
        wordle_compare[len(w)].append((w, freq))

        # -------------------------
        # WORDLE
        # -------------------------
        if basic_ok:
            wordle[len(w)].append((w, freq))

        # -------------------------
        # ANAGRAMME
        # -------------------------
        vowel_count = sum(1 for c in w if c in VOWELS)
        max_repeat = max(w.count(c) for c in set(w))

        anagram_ok = (
            pos != "VER" and
            vowel_count >= 1 and
            len(set(w)) >= 4 and
            max_repeat <= 2 and
            freq > 0.3
        )

        if anagram_ok:
            anagram[len(w)].append((w, freq))

# -----------------------
# LIMITES
# -----------------------
limits_wordle = {5: 4000, 6: 6000, 7: 6000}
limits_wordle_compare = {5: 15000, 6: 15000, 7: 20000}
limits_anagram = {5: 4000, 6: 4000, 7: 5000}

def export(data, limits, prefix):
    for l in lengths:
        unique = {}

        for w, freq in data[l]:
            if w not in unique or freq > unique[w]:
                unique[w] = freq

        sorted_words = sorted(unique.items(), key=lambda x: -x[1])
        final_words = [w for w, _ in sorted_words[:limits[l]]]

        random.shuffle(final_words)

        with open(f"{prefix}_{l}.json", "w", encoding="utf-8") as f:
            json.dump(final_words, f, indent=2, ensure_ascii=False)

        print(f"{prefix} {l} lettres : {len(final_words)} mots")

export(wordle, limits_wordle, "wordle")
export(wordle_compare, limits_wordle_compare, "wordle_compare")
export(anagram, limits_anagram, "anagram")