import re
import os
import sys
from tqdm import tqdm

keep = [
    'Client "\w+" spawned in server <.*> \(took \d+ seconds?\).',
    '\w+ is now in love with \w+.',
    "Dropped \w+ from server",
    'CP map: \w+',
    'CP round state',
    'ServerLog: [0-9.:]+ - ROUND_START',
    'ServerLog: [0-9.:]+ - CP_RC',
    'ServerLog: [0-9.:]+ - CP_TC',
    'ServerLog: [0-9.:]+ - CP_OE',
    'ServerLog: [0-9.:]+ - CP_DMG',
    'ServerLog: [0-9.:]+ - CP_KILL',
    ".* and gets (REWARDED|penalised for) \d+",
    "ServerLog: \w+ took \d+ credits? from the body of",
    'ServerLog: [0-9.:]+ - TTT2Revive:',
    'ServerLog: Result: \w+ wins?.',
    'ServerLog: Result: timelimit reached',
    'ServerLog: [0-9.:]+ - ROUND_END:',
    'ServerLog: [0-9.:]+ - ROUND_ENDED at given time',
    '\[TTT2 Medium Role\] Noisified chat'
]

not_needed = [
    'ServerLog: [0-9.:]+ - DMG:',
    'ServerLog: [0-9.:]+ - KILL:',
    'ServerLog: Round proper has begun...',
    "The round has begun!",
    '\w+ \(\d*\) hurt \w+ \(\d+\) and get',
    'ServerLog: Round ended.',
    'ServerLog: [0-9.:]+ - TTT2Doors',
    'ServerLog: [0-9.:]+ - TTT2-Vampire: \w+ transformed',
]

irrelevant = [
    'ServerLog: \[ULX\] \w+ changed the map to',
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
    ".* con var created",
    "CMaterial::PrecacheVars: error",
    "Player Customizer Spawn",
    "DataTable warning",
    "Warning: you appear to be idle/AFK",
    "MDLCache: Failed load of"
]

remove = not_needed + irrelevant

def match(line, regexes):
    for regex in regexes:
        if re.search(re.compile(regex), line):
            return True
    return False

def keepmatch(line):
    return match(line, keep)

def removematch(line):
    return match(line, remove)

if __name__ == "__main__":
    datestr = input("Enter datestring for log (yyyy.mm.dd): ")
    
    fin = open("console.log", "r", encoding="utf-8")
    ferr = open("unknown.log", "w", encoding="utf-8")
    
    foutname = f"logs/{datestr}.log"
    foutidx = 0
    while (os.path.exists(foutname)):
        foutidx += 1
        foutname = f"logs/{datestr} ({foutidx}).log"
            
    print(f"Writing cleaned log to '{foutname}'...")
    fout = open(foutname, "w", encoding="utf-8")

    # flush stdout before using tqdm progress bar
    sys.stdout.flush()
    
    for line in tqdm(fin):
        if keepmatch(line):
            fout.write(line)
        elif removematch(line):
            pass
        else:
            ferr.write(line)
    
    fin.close()
    fout.close()
    ferr.close()
    print("cleaning log finished")

    if (input("Move raw log? (Y/n)") != "n"):
        os.rename("console.log", f"logs/{datestr} ({foutidx}).raw.log")
    
    print("Finished!")