export interface CheatSheet {
  slug: string;
  title: string;
  description: string;
  note: string;
  source: string;
  sections: { title: string; commands: [string, string][] }[];
}

export const sheets: CheatSheet[] = [
  {
    slug: "tmux",
    title: "tmux",
    description: "Keep sessions running, organize windows, and work across panes.",
    note: "Default bindings: Prefix means press Ctrl+b, release, then press the next key. Run commands starting with tmux in your shell. Replace work with your session name. Custom configurations may change bindings.",
    source: "https://man.openbsd.org/tmux",
    sections: [
      { title: "Sessions", commands: [
        ["tmux new -s work", "Start a named session."],
        ["tmux ls", "List sessions."],
        ["tmux attach -t work", "Return to a session."],
        ["Prefix d", "Detach; leave programs running."],
        ["Prefix s", "Choose a session."],
        ["Prefix $", "Rename this session."],
      ] },
      { title: "Windows", commands: [
        ["Prefix c", "Create a window."],
        ["Prefix n / Prefix p", "Go to the next / previous window."],
        ["Prefix 0–9", "Select a window by number."],
        ["Prefix ,", "Rename this window."],
        ["Prefix w", "Browse sessions and windows."],
        ["Prefix &", "Kill this window after confirmation."],
      ] },
      { title: "Panes", commands: [
        ["Prefix %", "Split into left and right panes."],
        ['Prefix "', "Split into top and bottom panes."],
        ["Prefix Arrow", "Focus the pane in that direction."],
        ["Prefix o", "Focus the next pane."],
        ["Prefix z", "Toggle zoom for the current pane."],
        ["Prefix Space", "Cycle pane layouts."],
        ["Prefix x", "Kill this pane after confirmation."],
      ] },
      { title: "Scroll and help", commands: [
        ["Prefix [", "Enter copy mode to browse scrollback."],
        ["Arrow / PageUp / PageDown", "Navigate while in copy mode."],
        ["q (vi) / Esc (emacs)", "Leave copy mode; keys depend on mode-keys."],
        ["Prefix ]", "Paste the latest tmux buffer."],
        ["Prefix ?", "Show key bindings."],
        ["Prefix :", "Open the tmux command prompt."],
      ] },
    ],
  },
  {
    slug: "vim",
    title: "Vim",
    description: "Navigate, edit, search, and save without leaving the keyboard.",
    note: "Press Esc to return to Normal mode before using these commands. Commands beginning with : and searches beginning with / need Enter. Ctrl means hold Control; other sequences are typed in order. Vim commands are case-sensitive.",
    source: "https://vimhelp.org/quickref.txt.html",
    sections: [
      { title: "Save and quit", commands: [
        [":w", "Save the file."],
        [":wq", "Save and close the window."],
        [":q", "Close; fails if changes are unsaved."],
        [":q!", "Close and discard unsaved changes."],
        [":e filename", "Open a file."],
        [":help", "Open Vim help."],
      ] },
      { title: "Move around", commands: [
        ["h / j / k / l", "Move left / down / up / right."],
        ["w / b", "Jump to the next / previous word start."],
        ["0 / ^ / $", "Go to line start / first nonblank / line end."],
        ["gg / G", "Go to the first / last line."],
        [":42", "Jump to line 42."],
        ["Ctrl+d / Ctrl+u", "Scroll down / up half a screen."],
      ] },
      { title: "Insert and select", commands: [
        ["i / a", "Insert before / after the cursor."],
        ["I / A", "Insert at first nonblank / append at line end."],
        ["o / O", "Open a line below / above and start inserting."],
        ["Esc", "Leave Insert or Visual mode."],
        ["v / V / Ctrl+v", "Select characters / lines / a block."],
      ] },
      { title: "Edit and repeat", commands: [
        ["x / dd", "Delete a character / line."],
        ["yy / p / P", "Copy a line / paste after / paste before."],
        ["ciw", "Replace the word under the cursor."],
        ["u / Ctrl+r", "Undo / redo."],
        [".", "Repeat the last change."],
        ["3dd", "Delete three lines; counts work with many commands."],
        [">> / <<", "Indent / unindent a line."],
      ] },
      { title: "Search and replace", commands: [
        ["/pattern", "Search forward for a pattern."],
        ["n / N", "Repeat search / reverse its direction."],
        ["*", "Search forward for the word under the cursor."],
        [":%s/old/new/gc", "Replace throughout the file, confirming each match."],
        [":noh", "Clear search highlighting until the next search."],
      ] },
      { title: "Windows and buffers", commands: [
        [":split / :vsplit", "Split into stacked / side-by-side windows."],
        ["Ctrl+w, then h / j / k / l", "Focus a window in that direction."],
        [":ls", "List buffers."],
        [":bn / :bp", "Go to the next / previous buffer."],
      ] },
    ],
  },
];
