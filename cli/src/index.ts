import { DB_PATH } from "@server/configureRoutes";
import { Database } from "@server/database";
import readline from "readline";

const db = new Database(DB_PATH);
const rl = readline.createInterface(process.stdin, process.stdout);

function parseArgs(cmd: string): string[] {
    return cmd.split(' ').map((s) => s.trim()).slice(1);
}

function catchPromise(err: any) {
    if (err instanceof Error) {
        console.error("An error occurred: %s", err.message);
    } else if (typeof(err) === 'string') {
        console.error("An error occurred: %s", err);
    } else {
        console.error("An unknown error occurred.");
    }
}

function catchPromiseWithFn(fn: PromptFn): (err: any) => void {
    return (err) => {
        catchPromise(err);
        fn();
    };
}

function printHelp(fn: PromptFn) {
    console.log("-- Help Menu --");

    commands.forEach(function(cmd, _i, _arr) {
        if (cmd.args) {
            console.log(`%s %s\n    %s\n    aka: %s`, cmd.name, cmd.args.map((s) => `<${s}>`).join(' '), cmd.description, cmd.short);
        } else {
            console.log(`%s\n    %s\n    aka: %s`, cmd.name, cmd.description, cmd.short);
        }
    });

    fn();
}

function quit(_fn: PromptFn) {
    process.exit(0);
}

function getRegisterCodes(fn: PromptFn) {
    db.getAllRegistrationCodes()
        .then((codes) => {
            if (codes.length === 0) {
                console.log("No codes generated.");
            } else {
                console.log("Generated registration codes:");
                codes.forEach((code) => {
                    console.log(`${code.perm}: ${code.code}`);
                });
            }
        })
        .catch(catchPromise)
        .finally(fn);
}

function regenRegisterCodes(fn: PromptFn) {
    db.generateRegistrationCodes()
        .then(() => { getRegisterCodes(fn); })
        .catch(catchPromiseWithFn(fn));
}

function removeUser(fn: PromptFn, args?: string[]) {
    if (!args) {
        return;
    }

    const username = args[0];

    db.deleteUser(username)
        .then((success) => {
            if (success) {
                console.log(`Deleted ${username} successfully.`);
            } else {
                console.log(`Could not delete ${username}.`);
            }
        }).catch(catchPromise)
        .finally(fn);
}

type PromptFn = () => void;

type Command = {
    name: string,
    short: string,
    description: string,
    args?: string[],
    callback: (fn: PromptFn, args?: string[]) => void
};

const commands: Command[] = [
    {
        name: "codes",
        short: "c",
        description: "Gets the registration codes.",
        callback: getRegisterCodes
    },
    {
        name: "gencodes",
        short: "gc",
        description: "Regenerates the registration codes.",
        callback: regenRegisterCodes
    },
    {
        name: "help",
        short: "h",
        description: "Lists all usable commands.",
        callback: printHelp
    },
    {
        name: "quit",
        short: "q",
        description: "Closes the CLI.",
        callback: quit
    },
    {
        name: "remuser",
        short: "ru",
        description: "Deletes a user from the database.",
        args: ["username"],
        callback: removeUser
    }
];

function promptCommand() {
    rl.question("\n> ", rlCallback);
}

function rlCallback(cmd: string) {
    cmd = cmd.toLowerCase().trim();

    const spaceAt = cmd.indexOf(' ');
    const cmdName = spaceAt >= 0 ? cmd.slice(0, spaceAt) : cmd;

    const index = commands.findIndex((c, _i, _arr) => {
        return c.short === cmdName || c.name === cmdName;
    });

    if (index < 0) {
        console.error("Invalid command.");
        promptCommand();
    } else {
        const command = commands[index];
        const args = command.args ? parseArgs(cmd) : undefined;

        if (args) {
            if (args.length < command.args!.length) {
                console.error('Not enough arguments specified.');
                promptCommand();
                return;
            } else if (args.length > command.args!.length) {
                console.error('Too many arguments specified.');
                promptCommand();
                return;
            }
        }

        command.callback(promptCommand, args);
    }
}

console.log("VTC App CLI\nType 'help' or 'h' for a list of commands.");
promptCommand();