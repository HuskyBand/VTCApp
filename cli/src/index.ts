import { DB_PATH } from "@server/configureRoutes";
import { Database } from "@server/database";
import readline from "readline";

const db = new Database(DB_PATH);
const rl = readline.createInterface(process.stdin, process.stdout);

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
        console.log(`%s (%s): %s`, cmd.name, cmd.short, cmd.description);
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

type PromptFn = () => void;

type Command = {
    name: string,
    short: string,
    description: string,
    callback: (fn: PromptFn) => void
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
    }
];

function promptCommand() {
    rl.question("\n> ", rlCallback);
}

function rlCallback(cmd: string) {
    cmd = cmd.toLowerCase();

    let index = commands.findIndex((c, _i, _arr) => {
        return c.short === cmd || c.name === cmd;
    });

    if (index < 0) {
        console.error("Invalid command.");
        promptCommand();
    } else {
        commands[index].callback(promptCommand);
    }
}

console.log("VTC App CLI\nType 'help' or 'h' for a list of commands.");
promptCommand();