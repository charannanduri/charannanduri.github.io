// charan-xyz — a zsh-flavored terminal for charannanduri.github.io

const EMAIL = 'charan.n@icloud.com';
const PROMPT = 'guest@charan-xyz ~ %';
const USER = 'guest';
const HOME = '/Users/guest';

const pageLoadTime = Date.now();

// ---------------------------------------------------------------------------
// Welcome overlay (the "desktop" behind the terminal)
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const msg1 = document.getElementById('welcome-msg-1');
    const msg2 = document.getElementById('welcome-msg-2');
    const msg3 = document.getElementById('welcome-msg-3');

    const msg1Text = "Welcome to my personal website.";
    const msg2Text = "I'm an electrical engineer at Milwaukee Tool.";
    const msg3Text = "Type 'help' in the terminal to start.";

    const typingSpeed = 30;
    const backspaceSpeed = 20;
    const messageDelay = 1000;

    function typeWelcomeMessage(element, text, speed, callback) {
        let charIndex = 0;
        element.textContent = '';
        (function typeChar() {
            if (charIndex < text.length) {
                element.textContent += text[charIndex++];
                setTimeout(typeChar, speed);
            } else if (callback) {
                setTimeout(callback, messageDelay);
            }
        })();
    }

    function backspaceWelcomeMessage(element, speed, callback) {
        let text = element.textContent;
        (function backspaceChar() {
            if (text.length > 0) {
                text = text.slice(0, -1);
                element.textContent = text;
                setTimeout(backspaceChar, speed);
            } else if (callback) {
                setTimeout(callback, messageDelay / 2);
            }
        })();
    }

    if (msg1 && msg2 && msg3) {
        setTimeout(() => {
            typeWelcomeMessage(msg1, msg1Text, typingSpeed, () => {
                backspaceWelcomeMessage(msg1, backspaceSpeed, () => {
                    typeWelcomeMessage(msg2, msg2Text, typingSpeed, () => {
                        backspaceWelcomeMessage(msg2, backspaceSpeed, () => {
                            typeWelcomeMessage(msg3, msg3Text, typingSpeed, null);
                        });
                    });
                });
            });
        }, 500);
    }

    boot();
});

// ---------------------------------------------------------------------------
// Terminal setup
// ---------------------------------------------------------------------------
const output = document.getElementById('output');
const outputContainer = document.getElementById('output-container');
const inputLine = document.getElementById('input-line');
const inputElement = document.getElementById('input');
const mirror = document.getElementById('mirror');

let commandHistory = [];
let historyIndex = 0;
let sessionEnded = false;

function boot() {
    // macOS prints the last-login line at the top of every new session
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = n => String(n).padStart(2, '0');
    const stamp = `${days[now.getDay()]} ${months[now.getMonth()]} ${pad(now.getDate())} ` +
        `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    printLine(`Last login: ${stamp} on ttys000`);
    renderMirror();
    inputElement.focus();
}

// ---------------------------------------------------------------------------
// Output helpers — real terminals print instantly, so no typing animation here
// ---------------------------------------------------------------------------
function printLine(text = '') {
    const div = document.createElement('div');
    div.className = 'term-line';
    div.textContent = text === '' ? ' ' : text;
    output.appendChild(div);
    scrollToBottom();
    return div;
}

function printLines(lines) {
    lines.forEach(line => printLine(line));
}

// Print a line where URLs / emails become clickable, e.g. printLinkLine('Email:', 'mailto:x', 'x')
function printLinkLine(label, href, linkText) {
    const div = document.createElement('div');
    div.className = 'term-line';
    div.appendChild(document.createTextNode(label + ' '));
    const a = document.createElement('a');
    a.href = href;
    a.textContent = linkText;
    a.target = '_blank';
    a.rel = 'noopener';
    div.appendChild(a);
    output.appendChild(div);
    scrollToBottom();
}

// Echo the prompt + what the user typed into scrollback, like a real shell
function echoCommand(rawText, suffix = '') {
    const div = document.createElement('div');
    div.className = 'term-line';
    const promptSpan = document.createElement('span');
    promptSpan.className = 'prompt';
    promptSpan.textContent = PROMPT;
    div.appendChild(promptSpan);
    div.appendChild(document.createTextNode(' ' + rawText + suffix));
    output.appendChild(div);
    scrollToBottom();
}

function scrollToBottom() {
    outputContainer.scrollTop = outputContainer.scrollHeight;
}

// ---------------------------------------------------------------------------
// Block cursor: the real input is invisible; we mirror its value with a
// block cursor drawn at the caret position, like an actual terminal.
// ---------------------------------------------------------------------------
function renderMirror() {
    const value = inputElement.value;
    const pos = inputElement.selectionStart ?? value.length;
    const before = value.slice(0, pos);
    const at = pos < value.length ? value[pos] : ' ';
    const after = pos < value.length ? value.slice(pos + 1) : '';

    mirror.textContent = '';
    mirror.appendChild(document.createTextNode(before));
    const cursor = document.createElement('span');
    cursor.id = 'cursor';
    // Terminal.app shows a hollow cursor when the window loses focus
    if (!terminalFocused) cursor.className = 'unfocused';
    cursor.textContent = at;
    mirror.appendChild(cursor);
    mirror.appendChild(document.createTextNode(after));
}

let terminalFocused = true;

['input', 'keyup', 'click'].forEach(evt =>
    inputElement.addEventListener(evt, renderMirror)
);
inputElement.addEventListener('focus', () => { terminalFocused = true; renderMirror(); });
inputElement.addEventListener('blur', () => { terminalFocused = false; renderMirror(); });

// Clicking anywhere in the terminal focuses the input, unless the user is
// selecting text to copy — exactly how Terminal.app behaves.
document.getElementById('terminal').addEventListener('mouseup', () => {
    if (!sessionEnded && String(window.getSelection()).length === 0) {
        inputElement.focus({ preventScroll: true });
    }
});

// ---------------------------------------------------------------------------
// Key handling: Enter, history, tab completion, Ctrl+C, Ctrl+L
// ---------------------------------------------------------------------------
inputElement.addEventListener('keydown', function (event) {
    if (sessionEnded) { event.preventDefault(); return; }

    if (event.key === 'Enter') {
        const rawText = this.value;
        const command = rawText.trim();

        // The on-screen hint has served its purpose after the first command
        const msg3Element = document.getElementById('welcome-msg-3');
        if (command && msg3Element) msg3Element.classList.add('fade-out');

        echoCommand(rawText);
        if (command) {
            if (commandHistory[commandHistory.length - 1] !== command) {
                commandHistory.push(command);
            }
            runCommand(command);
        }
        historyIndex = commandHistory.length;
        this.value = '';
        renderMirror();
    } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            this.value = commandHistory[historyIndex];
            this.selectionStart = this.selectionEnd = this.value.length;
            renderMirror();
        }
    } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            this.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            this.value = '';
        }
        this.selectionStart = this.selectionEnd = this.value.length;
        renderMirror();
    } else if (event.key === 'Tab') {
        event.preventDefault();
        completeCommand(this);
    } else if (event.key === 'c' && event.ctrlKey) {
        event.preventDefault();
        echoCommand(this.value, '^C');
        this.value = '';
        historyIndex = commandHistory.length;
        renderMirror();
    } else if (event.key === 'l' && event.ctrlKey) {
        event.preventDefault();
        output.textContent = '';
    }
});

function completeCommand(input) {
    const partial = input.value;
    if (!partial || partial.includes(' ')) return;
    const matches = Object.keys(COMMANDS).filter(name => name.startsWith(partial.toLowerCase()));
    if (matches.length === 1) {
        input.value = matches[0] + ' ';
        input.selectionStart = input.selectionEnd = input.value.length;
        renderMirror();
    } else if (matches.length > 1) {
        echoCommand(partial);
        printLine(matches.join('  '));
    }
}

// ---------------------------------------------------------------------------
// Virtual files, so ls / cat behave like a real home directory
// ---------------------------------------------------------------------------
const FILES = {
    'about.txt': () => showAbout(),
    'resume.txt': () => showResume(),
    'projects.json': () => {
        fetch('projects.json')
            .then(res => res.text())
            .then(text => printLines(text.trimEnd().split('\n')))
            .catch(() => printLine('cat: projects.json: Input/output error'));
    },
};

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------
const COMMANDS = {
    'help': {
        desc: 'list available commands',
        run: () => {
            printLines([
                'Available commands:',
                '',
                '  about        who I am',
                '  resume       experience, skills, education',
                '  projects     things I’ve built',
                '  contact      how to reach me',
                '  about-site   how this site was made',
                '',
                'Plus the usual suspects: ls, cat, pwd, whoami, date, echo,',
                'history, neofetch, clear, exit — and a few easter eggs.',
                '',
                'Tip: Tab completes commands, ↑/↓ walk history, Ctrl+C cancels.',
            ]);
        },
    },
    'about': { desc: 'who I am', run: () => showAbout() },
    'resume': { desc: 'experience, skills, education', run: () => showResume() },
    'projects': {
        desc: 'things I’ve built',
        run: () => {
            fetch('projects.json')
                .then(res => res.json())
                .then(projects => {
                    const lines = ['Projects:', ''];
                    projects.forEach((p, i) => {
                        lines.push(`${i + 1}. ${p.title}`);
                        lines.push(`   ${p.description}`);
                        lines.push('');
                    });
                    printLines(lines);
                })
                .catch(() => printLine('Error: could not load projects.'));
        },
    },
    'contact': {
        desc: 'how to reach me',
        run: () => {
            printLinkLine('Email:   ', `mailto:${EMAIL}`, EMAIL);
            printLinkLine('LinkedIn:', 'https://linkedin.com/in/charannanduri', 'linkedin.com/in/charannanduri');
            printLinkLine('GitHub:  ', 'https://github.com/charannanduri', 'github.com/charannanduri');
        },
    },
    'about-site': {
        desc: 'how this site was made',
        run: () => {
            printLines([
                'Built in 2024 in Columbus, OH — rebuilt in 2026 from Chicago, IL —',
                'by a Human and a Robot.',
                '',
                'I spend a lot of time in the macOS terminal, so I emulated it for my',
                'personal site. Plain HTML, CSS, and JavaScript — no frameworks.',
                'AI helped along the way, but a lot of it was trial and error by me.',
                '',
            ]);
            printLinkLine('Source code:', 'https://github.com/charannanduri/charannanduri.github.io', 'github.com/charannanduri/charannanduri.github.io');
            printLine('');
            printLine(`Want to build something like this? Email ${EMAIL} and I'll get you sorted.`);
        },
    },
    'ls': {
        desc: 'list files',
        run: () => printLine(Object.keys(FILES).sort().join('    ')),
    },
    'cat': {
        desc: 'print a file',
        run: (args) => {
            if (args.length === 0) { printLine('usage: cat <file>'); return; }
            const reader = FILES[args[0]];
            if (reader) reader();
            else printLine(`cat: ${args[0]}: No such file or directory`);
        },
    },
    'pwd': { desc: 'print working directory', run: () => printLine(HOME) },
    'whoami': { desc: 'print current user', run: () => printLine(USER) },
    'date': { desc: 'print the date', run: () => printLine(new Date().toString()) },
    'echo': { desc: 'echo arguments', run: (args) => printLine(args.join(' ')) },
    'history': {
        desc: 'command history',
        run: () => printLines(commandHistory.map((c, i) => `  ${String(i + 1).padStart(3)}  ${c}`)),
    },
    'clear': { desc: 'clear the screen', run: () => { output.textContent = ''; } },
    'neofetch': {
        desc: 'system info',
        run: () => {
            const uptimeSec = Math.floor((Date.now() - pageLoadTime) / 1000);
            const uptime = uptimeSec >= 60
                ? `${Math.floor(uptimeSec / 60)} min${Math.floor(uptimeSec / 60) === 1 ? '' : 's'}, ${uptimeSec % 60} secs`
                : `${uptimeSec} secs`;
            printLines([
                '            .:’          guest@charan-xyz',
                '        __ :’__          ----------------',
                '     .’`__`-’__``.       OS:       charanOS 2.0 (Chicago)',
                '    :__________.-’       Host:     charannanduri.github.io',
                '    :_________:          Shell:    zsh 5.9',
                '     :_________`-;       Uptime:   ' + uptime,
                '      `.__.-.__.’        Job:      Electrical Engineer @ Milwaukee Tool',
                '                         Editor:   Altium Designer (don’t @ me)',
                '                         Terminal: the one you’re looking at',
            ]);
        },
    },
    'sudo': {
        desc: '',
        hidden: true,
        run: () => printLine(`${USER} is not in the sudoers file.  This incident will be reported.`),
    },
    'block o': {
        desc: '',
        hidden: true,
        run: () => {
            printLines([
                '-/OOOOOOOOOOOOOOOOOO\\-',
                '/OOOOOOOOOOOOOOOOOOOO\\',
                '|OOOOOO/------\\OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '|OOOOOO|------|OOOOOO|',
                '\\OOOOOOOOOOOOOOOOOOOO/',
                '-\\OOOOOOOOOOOOOOOOOO/-',
                '',
                'Go Bucks!',
            ]);
        },
    },
    'exit': {
        desc: 'end the session',
        run: () => {
            printLines([
                '',
                'Saving session...',
                '...copying shared history...',
                '...saving history...truncating history files...',
                '...completed.',
                '',
                '[Process completed]',
            ]);
            sessionEnded = true;
            inputLine.style.display = 'none';
            inputElement.blur();
        },
    },
};

// Aliases for old muscle memory / forgiving input
const ALIASES = {
    'about site': 'about-site',
    'aboutsite': 'about-site',
    'blocko': 'block o',
    'cv': 'resume',
    'email': 'contact',
    'ls -la': 'ls',
    'ls -l': 'ls',
    'ls -a': 'ls',
};

function showAbout() {
    printLines([
        "Hey, I'm Charan. I'm an electrical engineer at Milwaukee Tool, living in",
        'Chicago. I studied Electrical & Computer Engineering at Ohio State.',
        '',
        'I enjoy building electronics, following economics & markets, and',
        "basketball. Let's Go Cavs!",
        '',
        "Run 'contact' to reach me, or 'resume' for the full rundown.",
    ]);
}

function showResume() {
    printLines([
        'Venkat (Charan) Nanduri',
        'Electrical Engineer @ Milwaukee Tool',
        'Chicago, IL',
        '',
        'Experience:',
        '  Milwaukee Tool — Electrical Engineer',
        '  Previously: EE Intern @ Milwaukee Tool; Undergraduate Research',
        '  Assistant @ OSU Center for High Performance Power Electronics',
        '',
        'Skills:',
        '  Microelectronics, Computer Architecture, Linux, Altium Designer,',
        '  C/C++, MATLAB',
        '',
        'Education:',
        '  B.S. Electrical & Computer Engineering, Minor in Economics',
        '  The Ohio State University (started at Purdue University)',
        '',
    ]);
    printLinkLine(`For a PDF copy of my resume, email`, `mailto:${EMAIL}`, EMAIL);
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------
function runCommand(rawCommand) {
    let name = rawCommand.toLowerCase();
    if (ALIASES[name]) name = ALIASES[name];

    // Exact multi-word commands first (e.g. "block o"), then word split
    let entry = COMMANDS[name];
    let args = [];
    if (!entry) {
        const parts = rawCommand.split(/\s+/);
        const head = parts[0].toLowerCase();
        entry = COMMANDS[ALIASES[head] || head];
        args = parts.slice(1);
    }

    if (entry) {
        entry.run(args);
    } else {
        printLine(`zsh: command not found: ${rawCommand.split(/\s+/)[0]}`);
    }
}
