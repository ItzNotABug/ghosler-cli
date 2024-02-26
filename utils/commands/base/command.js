import fs from 'fs';
import Utils from '../../utils.js';
import PM2Manager from '../../pm2/manager.js';

/**
 * Represents an abstract base class for commands.
 *
 * This class cannot be instantiated directly and
 * requires the subclasses to implement the `doTask` method.
 */
export default class BaseCommand {

    /**
     * Base constructor, this cannot be instantiated!
     */
    constructor() {
        if (this.constructor === BaseCommand) {
            throw new Error("This class cannot be instantiated!");
        }
    }

    /**
     * Build a command for yargs.
     *
     * @returns {{
     *   command: string,
     *   description: string,
     *   builder: (yargs: any) => any,
     *   handler: (argv: any) => Promise<void>
     * }} - The yargs compatible command for processing.
     */
    static yargsCommand() {
        throw new Error("`command` method must be implemented by subclasses.");
    }

    /**
     * Checks if the application can proceed based on the number of processes running.
     *
     * @param {Object} argv - The arguments passed via the command line, processed by yargs.
     * @returns {Promise<boolean>} - A promise that resolves to `true` if the operation can proceed, `false` otherwise.
     */
    static async canProceed(argv = {}) {
        const hasMultipleProcesses = await Utils.hasMultipleProcesses();

        if (hasMultipleProcesses) {
            if (!argv?.name) {
                Utils.logFail('Please use the --name option to specify an instance. Use `ghosler ls` to list all the processes.');
                return false;
            }
        } else {
            if (!argv?.name) {
                const processes = await PM2Manager.listProcesses();
                if (processes.length > 0) argv.name = processes[0].name;
                else {
                    Utils.logFail('No processes found.');
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Check whether a directory is empty or not.
     *
     * @param {string} path - The directory path to check.
     * @returns {Promise<boolean>} - A promise that resolves to `true` if the directory is empty, `false` otherwise.
     */
    static async isDirectoryEmpty(path = process.cwd()) {
        return fs.readdirSync(path).length === 0;
    }

    /**
     * The action performed by the extending class.
     *
     * @param {Object} argv - Object containing user input values.
     * @throws {Error} - If the subclass does not implement this method.
     */
    static async #performTask(argv) {
        throw new Error("`#performTask` method must be implemented by subclasses.");
    }
}