#LAUNCH WITH python3 <file_name>
import json
import unicodedata
import random

def normalize(word):
    word = unicodedata.normalize('NFD', word)
    word = ''.join(c for c in word if unicodedata.category(c) != 'Mn')
    word = ''.join(c for c in word if c.isalpha())
    return word.lower()

lengths = [5, 6, 7, 8]

wordle = {l: [] for l in lengths}
anagram = {l: [] for l in lengths}

with open("Lexique4.tsv", "r", encoding="utf-8") as f:
    header = f.readline().strip().split("\t")

    word_i = header.index("1_Mot")
    freq_i = header.index("10_FreqMot")
    cgram_i = header.index("5_Cgram")

    for line in f:
        cols = line.strip().split("\t")

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
            freq > 1 and
            pos != "VER" and
            not w.endswith("s") and
            not w.endswith("ent") and
            not w.endswith("ant") and
            len(set(w)) > 2
        )

        if not basic_ok:
            continue

        # -----------------------
        # WORDLE (strict + fréquent)
        # -----------------------
        if freq > 3:
            wordle[len(w)].append((w, freq))

        # -----------------------
        # ANAGRAMME (plus permissif mais propre)
        # -----------------------
        vowels = set("aeiouy")
        vowel_count = sum(1 for c in w if c in vowels)

        # filtres anagramme spécifiques
        anagram_ok = (
            vowel_count >= 1 and          # pas de mots injouables
            len(set(w)) >= 4 and          # diversité lettres
            freq > 0.5                    # un peu plus large
        )

        if anagram_ok:
            anagram[len(w)].append((w, freq))

# -----------------------
# LIMITES
# -----------------------
limits_wordle = {5: 3000, 6: 4000, 7: 5000, 8: 6000}
limits_anagram = {5: 3000, 6: 4000, 7: 5000, 8: 6000}

def export(data, limits, prefix):
    for l in lengths:
        unique = {}

        for w, freq in data[l]:
            if w not in unique or freq > unique[w]:
                unique[w] = freq

        sorted_words = sorted(unique.items(), key=lambda x: -x[1])

        final_words = [w for w, _ in sorted_words[:limits[l]]]

        # shuffle léger pour anagram pool
        random.shuffle(final_words)

        with open(f"{prefix}_{l}.json", "w", encoding="utf-8") as f:
            json.dump(final_words, f, indent=2, ensure_ascii=False)

        print(f"{prefix} {l} lettres : {len(final_words)} mots")

# export Wordle
export(wordle, limits_wordle, "wordle")

# export Anagramme
export(anagram, limits_anagram, "anagram")
