import re
import os
import sys
from tqdm import tqdm

keep = [
    'Map: \w+',
    'Client "\w+" spawned in server <.*> \(took \d+ seconds?\).',
    'ServerLog: Round proper has begun...',
    'ROUND_START: \w+ is \w+',
    'ServerLog: ..:..... - CP_RC',
    'ServerLog: ..:..... - CP_OE',
    'ServerLog: ..:..... - CP_DMG',
    'ServerLog: ..:..... - CP_KILL',
    'ServerLog: ..:..... - CP_RC',
    '\w+ is now in love with \w+.',
    'ServerLog: ..:..... - TTT2Revive:',
    'ServerLog: Result: \w+ wins/.',
    'ServerLog: ..:..... - ROUND_START',
    'ServerLog: ..:..... - ROUND_END:',
    'ServerLog: ..:..... - ROUND_ENDED at given time',
    'Schnitzelboy \(\d*\) hurt \w+ \(\d+\) and get',
    'ServerLog: ..:..... - DMG:',
    'ServerLog: ..:..... - KILL:',
    "Dropped \w+ from server",
    "[TTT2]:\s*The \w* has won!",
    "ServerLog: \w+ took \d+ credits? from the body of"
]

remove = [
    '^\[DLib\]',
    '^\s*$',
    '^env_cubemap',
    '^//.*//',
    '^Added TTT2',
    '^Marked TTT2',
    '^Marked and added TTT2',
    "^\[TTT2\]\[ROLE\]",
    "^\[TTT2\]\[ROLE-SYSTEM\]",
    "^\[TTT2\]\[MINIGAMES\]",
    "^\[TTT2\]\[Huds\]",
    '^\[ULX\]',
    "^\[PAM\]",
    '^Attempted to create',
    "^Addon .* contains file from",
    '^Unknown command',
    "^\[DEPRECATION WARNING\]",
    "^Failed to load custom font file",
    "^No such variable",
    "^  1. ",
    "^\[ERROR\]",
    "^Error",
    "^ERROR",
    "^KeyValues Error",
    "Addon .* is already mounted",
    "\[.*\] Lua Error:",
    "^CUtlLinkedList overflow!",
    "^CShadowMgr",
    "^VertexLitGeneric",
    "^JOY_AXIS_",
    "^WARNING: Addon",
    "^\s*Reason:",
    "^material .* has a normal map and an envmapmask",
    "^Refusing to load ",
    "^Incompatible add-on detected",
    "--> Detected add-on",
    ".* con var created"
]

def match(line, regexes):
    for regex in regexes:
        if re.match(re.compile(regex), line):
            return True
    return False

def keepmatch(line):
    return match(line, keep)

def removematch(line):
    return match(line, remove)

if __name__ == "__main__":
    datestr = input("Enter datestring for log (dd.mm.yyyy): ")
    
    fin = open("console.log", "r", encoding="utf-8")
    ferr = open("unknown.log", "w", encoding="utf-8")
    
    if os.path.exists(f"logs/{datestr}.log"):
        i = 1;
        while (os.path.exists(f"logs/{datestr} ({i}).log")):
            i += 1
        fout = open(f"logs/{datestr} ({i}).log", "w", encoding="utf-8")
        print(f"Writing cleaned log to 'logs/{datestr} ({i}).log'")
    else:
        fout = open(f"logs/{datestr}.log", "w", encoding="utf-8")
        print(f"Writing cleaned log to 'logs/{datestr}.log'")

    # flush stdout before using tqdm progress bar
    sys.stdout.flush()
    
    for line in tqdm(fin):
        if keepmatch(line):
            fout.write(line)
        elif removematch(line):
            pass
        else:
            ferr.write(line)
    
    print("Finished!")