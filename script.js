document.addEventListener('DOMContentLoaded', (event) => {
    // const welcomeMessage = "Welcome to Charan.xyz, my personal website.\n Im a 4th year ECE student at Ohio State.\n\nType 'help' to see available commands.";
    // appendToOutput(welcomeMessage); // Removed: Welcome message now in HTML overlay

    const inputElement = document.getElementById('input');
    const welcomeOverlay = document.getElementById('welcome-overlay');
    const msg1 = document.getElementById('welcome-msg-1');
    const msg2 = document.getElementById('welcome-msg-2');
    const msg3 = document.getElementById('welcome-msg-3');

    const msg1Text = "Welcome to my personal website.";
    const msg2Text = "I'm an ECE student at Ohio State.";
    const msg3Text = "Type 'help' in the terminal to start.";

    const typingSpeed = 30; // Milliseconds per character
    const backspaceSpeed = 20; // Faster backspace speed
    const messageDelay = 1000; // Delay after a message finishes typing/backspacing

    // Helper function for typing effect
    function typeWelcomeMessage(element, text, speed, callback) {
        let charIndex = 0;
        element.textContent = '';

        function typeChar() {
            if (charIndex < text.length) {
                element.textContent += text[charIndex++];
                setTimeout(typeChar, speed);
            } else if (callback) {
                setTimeout(callback, messageDelay); // Wait before calling next step (e.g., backspace)
            }
        }
        typeChar();
    }

    // Helper function for backspace effect
    function backspaceWelcomeMessage(element, speed, callback) {
        let text = element.textContent;
        
        function backspaceChar() {
            if (text.length > 0) {
                text = text.slice(0, -1);
                element.textContent = text;
                setTimeout(backspaceChar, speed);
            } else if (callback) {
                setTimeout(callback, messageDelay / 2); // Shorter delay before typing next message
            }
        }
        backspaceChar();
    }

    // Start the typing/backspacing sequence
    if (msg1 && msg2 && msg3) {
        setTimeout(() => { // Initial delay
            typeWelcomeMessage(msg1, msg1Text, typingSpeed, () => {
                // After msg1 types, backspace it
                backspaceWelcomeMessage(msg1, backspaceSpeed, () => {
                    // After msg1 backspaces, type msg2
                    typeWelcomeMessage(msg2, msg2Text, typingSpeed, () => {
                        // After msg2 types, backspace it
                        backspaceWelcomeMessage(msg2, backspaceSpeed, () => {
                            // After msg2 backspaces, type msg3
                            typeWelcomeMessage(msg3, msg3Text, typingSpeed, null); // Pass null callback
                        });
                    });
                });
            });
        }, 500); // Short initial delay
    }
});

// Command History
let commandHistory = [];
let historyIndex = -1; // Initialize history index
let resumeViewed = false;

const inputElement = document.getElementById('input');

inputElement.addEventListener('keydown', function(event) {
    const command = this.value.trim();
    const msg3Element = document.getElementById('welcome-msg-3');

    if (event.key === "Enter") {
        // Check if the command is 'help' and fade out the persistent message
        if (command.toLowerCase() === 'help' && msg3Element) {
             msg3Element.classList.add('fade-out'); // Add class to trigger CSS fade
        }

        if (command) {
            processCommand(command);
            // Add to history only if it's different from the last command
            if (commandHistory.length === 0 || commandHistory[commandHistory.length - 1] !== command) {
                 commandHistory.push(command);
            }
            historyIndex = commandHistory.length; // Reset history index to the end
            this.value = ''; // Clear input after enter
        } else {
            // If Enter is pressed with no command, just add a new prompt line
            appendToOutput('', ''); // Pass empty strings to signify no command was run
        }
    } else if (event.key === "ArrowUp") {
        event.preventDefault(); // Prevent cursor jump
        if (historyIndex > 0) {
            historyIndex--;
            this.value = commandHistory[historyIndex];
            // Move cursor to end of the restored command
            setTimeout(() => this.selectionStart = this.selectionEnd = this.value.length, 0);
        }
    } else if (event.key === "ArrowDown") {
        event.preventDefault(); // Prevent cursor jump
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            this.value = commandHistory[historyIndex];
            // Move cursor to end of the restored command
            setTimeout(() => this.selectionStart = this.selectionEnd = this.value.length, 0);
        } else if (historyIndex === commandHistory.length - 1) {
            // If at the bottom of history, pressing down again clears the input
            historyIndex = commandHistory.length;
            this.value = '';
        }
    }
});

function processCommand(command) {
    const output = document.getElementById('output');
    // Display the command line itself before processing/typing output
    appendToOutput(command, command);

    switch (command.toLowerCase()) {
        case 'help':
            const helpCommands = [
                "Available Commands:",
                "about: a little about myself",
                "resume: summarized resume and a link to download the pdf",
                "projects: a list of projects that Ive done (sorry its not updated supper often)",
                "about site: how I built this site, and how you could make something similar!",
                "Theres also some easter eggs..."

            ];
            typeOut(helpCommands, output);
            break;
        case 'about':
            const aboutCharan = [
                "Hey, I'm Charan. I enjoy building electronics, economics & markets. I also love basketball. Lets Go Cavs!. Feel free to drop me a line or LinkedIn. Use the resume command to find my handle!"
            ];
            typeOut(aboutCharan, output);
            break;
        case 'about site':
            const aboutSite = [
                "Built in 2024, in Columbus, OH by a Human and a Robot",
                "",
                "I spend a bunch of time in the macOS terminal, I thought it would be cool to emulate it for my personal site.",
                "This was all built in native CSS, JS and HTML.",
                "While I did use GPT4 Turbo for some of the site, and Gemini 2.5 Pro to update it, ",
                "a lot of it was done by me with a ton of trial and error.",
                "Check out my GitHub for the source code!",
                "If you want to build a site just like this, email me at nanduri.9@osu.edu, and I'll get you sorted.",

            ];
            typeOut(aboutSite, output);
            break;
        case 'resume':
            resumeViewed = true;
            const resumeContent = [
                "Venkat (Charan) Nanduri",
                "Electrical & Computer Engineering", 
                "Minor in Economics",
                "Contact: nanduri.9@osu.edu | (614) 542-9691 | linkedin.com/in/charannanduri",
                "Experience:",
                "Electrical Engineering Intern at Milwaukee Tool, Undergraduate Research Assistant at OSU",
                "Skills:", 
                "Microelectronics, Computer Architecture, Linux, Altium Designer, C/C++, MATLAB",
                "Projects:",
                "Currently: Porting PebbleOS to ESP32-S3",
                "Other: Capacitive Touch Sensing, Liquid Metal Cooled Inverter, Inductive Sensing, Pi Pico Clock",
                "Education:",
                 "The Ohio State University, Purdue University",
            ];
            const resumeLink = document.createElement('a');
            resumeLink.href = 'resume.pdf'; // Update with the correct path
            resumeLink.textContent = 'Click for Resume PDF';
            resumeLink.style.color = '#00ff00'; // Set the link color to match your terminal
            resumeLink.target = '_blank'; // Opens in a new tab

            const newLine = document.createElement('div');
            newLine.appendChild(resumeLink);
            output.appendChild(newLine);
            typeOut(resumeContent, output);
            break;
        case 'projects':
            if(resumeViewed){
                fetch('projects.json')
                    .then(res => res.json())
                    .then(projects => {
                        const projectsContent = ["Projects:", ""];
                        projects.forEach((p, i) => {
                            projectsContent.push(`${i + 1}. ${p.title} - `);
                            projectsContent.push(p.description);
                        });
                        typeOut(projectsContent, output);
                    })
                    .catch(() => {
                        typeOut(["Error: could not load projects."], output);
                    });
            }
            else if(!resumeViewed)
            {
                const projError = [
                    "Error: in order to access project descriptions, you must first enter the resume command."
                ]
                typeOut(projError, output);
            }
            break;
        case 'block o':
            const blockO = [
                "-/OOOOOOOOOOOOOOOOOO\\-",
                "/OOOOOOOOOOOOOOOOOOOO\\",
                "|OOOOOO/------\\OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "|OOOOOO|------|OOOOOO|",
                "\\OOOOOOOOOOOOOOOOOOOO/",
                "-\\OOOOOOOOOOOOOOOOOO/-",
                "",
                "Go Bucks!",

            ];
            typeOut(blockO, output);
            break;
            
        default:
            // Create a div for the error message directly
            const errorLine = document.createElement('div');
            errorLine.textContent = 'Error: Command not found. type help for a list of commands';
            output.appendChild(errorLine); // Append the error line
            appendToOutput('', ''); // Append the next prompt line
            return; // Exit switch to avoid calling typeOut
    }
    // Note: typeOut now handles appending the next prompt after it finishes
}

function typeOut(lines) {
    const output = document.getElementById('output');
    let currentLine = 0;

    function typeLine() {
        if (currentLine < lines.length) {
            let line = lines[currentLine];
            let charIndex = 0;
            let currentLineDiv = document.createElement('div'); // Create div for the line
            output.appendChild(currentLineDiv); // Append div to output area

            let typeChar = function() {
                if (charIndex < line.length) {
                    currentLineDiv.textContent += line[charIndex++]; // Append char to the line div
                    scrollToBottom();
                    setTimeout(typeChar, 10); // Typing speed
                } else {
                    // Finished typing this line
                    currentLine++;
                    if (currentLine < lines.length) {
                        setTimeout(typeLine, 10); // Start next line quickly
                    } else {
                        // Finished typing all lines for this command
                        appendToOutput('', ''); // Append the next prompt line *after* all typing is done
                    }
                }
            };
            typeChar(); // Start typing the first character of the current line
        }
    }

    typeLine(); // Start typing the first line
}

function scrollToBottom() {
    const outputContainer = document.getElementById('output-container');
    outputContainer.scrollTop = outputContainer.scrollHeight;
}

// Modified appendToOutput to handle displaying the command line or just the next prompt
function appendToOutput(commandText, outputText) {
    const output = document.getElementById('output');

    // If commandText is provided, display the command line prompt + command
    /* // REMOVING THIS BLOCK
    if (commandText) {
        const promptLine = document.createElement('div');
        promptLine.className = 'input-line'; // Reuse class for styling
        // Escape HTML in commandText if necessary, but simple commands are likely fine
        promptLine.innerHTML = `<div class="prompt">user@charan.xyz:~$</div><div>${commandText}</div>`;
        output.appendChild(promptLine);
    }
    */

    // If outputText is provided (and different from commandText, though not strictly checked here),
    // display it. In the current setup, typeOut handles the actual command output.
    // This function is now primarily for the command echo and the next prompt line.

    // If commandText is empty string (''), it signifies we just need the next prompt line
    // THIS PART IS ALSO NOT NEEDED as typeOut calls this after finishing
    /* // REMOVING THIS BLOCK TOO
    if (commandText === '') {
        const nextPromptLine = document.getElementById('input-line').cloneNode(true);
        const inputInPrompt = nextPromptLine.querySelector('input');
        if(inputInPrompt) inputInPrompt.remove(); // Remove input field from cloned prompt
        nextPromptLine.removeAttribute('id'); // Remove ID from clone
        output.appendChild(nextPromptLine);
    }
    */

    // The only thing this function needs to do now is ensure scrolling
    scrollToBottom(); // Scroll the output into view
}