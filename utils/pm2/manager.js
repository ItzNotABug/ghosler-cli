import chalk from 'chalk';
import {promisify} from 'util';
import Utils from '../utils.js';
import {exec} from 'child_process';

/**
 * A class that acts as a wrapper over PM2 to manage Ghosler instances.
 */
export default class PM2Manager {

    static baseAppName = 'ghosler-app';
    static #productionEnv = 'NODE_ENV=production'; // why do we have this as a variable here?
    static #ghoslerInstanceTypeIdentifier = 'INSTANCE_TYPE_GHOSLER';

    /**
     * Keep a cached list of processes in memory for a fast path quick access.
     *
     * @type {Array<{pid: string, name: string, path: string, status: string}>}
     */
    static #cachedProcessNames = [];

    /**
     * Promisified version of `child_process.exec` for asynchronous command execution.
     */
    static #exec = promisify(exec);

    /**
     * Registers a new instance of the application with PM2, including dependency installation.
     * Automatically generates a unique name if multiple instances are to be registered.
     *
     * @param {string} branch - The branch to pull the instance from.
     * @param {string|null} instanceName - A custom instance provided by the user.
     * @returns {Promise<{status: boolean, message: string}>} - A promise that resolves to the registered status with a message.
     */
    static async register(branch = 'release', instanceName = this.baseAppName) {
        let appName = instanceName;
        if (branch !== 'release') appName += `-${branch}`;

        // Generate a unique name if required.
        appName = await this.#generateUniqueName(appName);

        await this.#execAsync(`${this.#productionEnv} npm ci --omit-dev && ${this.#productionEnv} pm2 start app.js --no-autorestart --name ${appName} -- ${this.#ghoslerInstanceTypeIdentifier}`);
        await this.#updateProcesses();

        const runningFine = await this.#checkIfAppOnline(appName);

        return {
            status: runningFine,
            message: runningFine
                ? appName === this.baseAppName
                    ? `Ghosler instance registered with default process name.`
                    : `Ghosler instance registered with process name: ${appName}.`
                : 'There was a problem starting out Ghosler. See logs via `ghosler logs error`'
        };
    }

    /**
     * Restarts a specified application instance, with optional dependency reinstallation.
     *
     * @param {string} name - The name of the application instance to restart.
     * @param {boolean} isUpdate - If true, reinstall dependencies before restarting.
     * @returns {Promise<{status: boolean, message: string}>} - A promise that resolves to the registered status with a message.
     */
    static async restart(name, isUpdate = false) {
        if (isUpdate) {
            const instance = await this.getProcess(name);
            await this.#execAsync(`pm2 stop ${name} && ${this.#productionEnv} npm ci --prefix ${instance.path} --omit-dev && ${this.#productionEnv} pm2 restart ${name}`);
        } else await this.#execAsync(`pm2 restart ${name}`);

        await this.#updateProcesses();

        const runningFine = await this.#checkIfAppOnline(name);

        return {
            status: runningFine,
            message: runningFine
                ? name === this.baseAppName
                    ? `Ghosler instance was restarted successfully.`
                    : `Ghosler instance (${name}) was restarted successfully.`
                : `There was a problem restarting Ghosler instance (${name}). See logs via \`ghosler logs error\`.`
        };
    }

    /**
     * Retrieves and displays logs for a specified application instance.
     *
     * @param {string} name - The name of the application instance.
     * @param {string} type - The type of logs to display ('error' or 'out').
     */
    static async logs(name, type) {
        let logs = await this.#execAsync(`pm2 logs ${name} ${type === 'error' ? '--err' : '--out'} --nostream`);

        let lines = logs
            .split('\n')
            .filter(line => !line.includes('[TAILING]') && !line.includes('.pm2/logs/'));

        logs = lines.join('\n');
        console.log(type === 'error' ? chalk.red(logs) : logs);
    }

    /**
     * List the registered Ghosler instances.
     *
     * @returns {Promise<string>} - A structured list of registered process if they exist.
     */
    static async ls() {
        const processes = await this.#listProcesses();
        return processes.length === 0
            ? 'No Ghosler processes found.' :
            'List of registered processes (instances):\n' +
            processes.map((process, index) => {
                return `  ${index + 1}. Process Name: '${process.name}' (pid: ${process.pid}), Status: ${process.status}`;
            }).join('\n');
    }

    /**
     * Uninstalls a specified application instance from PM2.
     *
     * @param {string} name - The name of the ghosler instance to uninstall.
     * @returns {string|null} - The path of the provided ghosler instance. Could be `null`.
     */
    static async uninstall(name) {
        const instance = this.#cachedProcessNames.find((process) => process.name === name) ?? null;
        try {
            await this.#execAsync(`pm2 delete ${name}`);
        } catch (error) {
            // ignore
            console.log(error);
        }

        await this.#updateProcesses();

        return instance?.path;
    }

    /**
     * Flushes logs for a specified application instance managed by PM2.
     *
     * @param {string} name - The name of the application instance.
     */
    static async flush(name) {
        await this.#execAsync(`pm2 flush ${name}`);
    }

    /**
     * Generates a startup script for the application to enable automatic restarts after a reboot.
     *
     * @returns {Promise<string>} - A promise that resolves to the startup script command.
     */
    static async startup() {
        const result = await this.#execAsync('pm2 startup');
        const commandLine = result.split('\n').find(line => line.trim().startsWith('sudo'));
        const command = commandLine ? commandLine.trim() : 'na';

        if (command !== 'na') await this.#execAsync(command);
    }

    /**
     * Generates an unstartup script to disable automatic restarts of the application after a reboot.
     *
     * @returns {Promise<string>} - A promise that resolves to the unstartup script command.
     */
    static async unstartup() {
        const result = await this.#execAsync('pm2 unstartup');
        const commandLine = result.split('\n').find(line => line.trim().includes('sudo'));
        const command = commandLine ? commandLine.trim() : 'na';

        if (command !== 'na') await this.#execAsync(command);
    }

    /**
     * Checks if there are multiple processes registered via PM2 and return their status.
     *
     * @returns {Promise<boolean>} - An promise indicating whether multiple processes are found (true or false).
     */
    static async hasMultipleProcesses() {
        const processes = await this.#listProcesses();
        return processes.length > 1;
    }

    /**
     * Update the processes on addition or removal of an instance.
     *
     * @returns {Promise<void>} - Nothing.
     */
    static async #updateProcesses() {
        await this.#listProcesses(true);
    }

    /**
     * List the registered processes.
     *
     * @returns {Promise<Array<{pid: string, name: string, path: string, status: string}>>} - Registered Processes.
     */
    static async listProcesses() {
        return await this.#listProcesses();
    }

    /**
     * Get a registered Ghosler process by its name.
     *
     * @param {string} name - The instance to look for by the given name.
     * @returns {Promise<{pid: string, name: string, path: string, status: string}|null>} - The process if found, null otherwise.
     */
    static async getProcess(name) {
        return (await this.listProcesses()).find(process => process.name === name);
    }

    /**
     * Returns a list of all registered PM2 processes that match the base app name.
     *
     * @param {boolean} forceUpdate - Whether to force check the list to update the cached list.
     * @returns {Promise<Array<{pid: string, name: string, path: string, status: string}>>} - An array of process info objects.
     */
    static async #listProcesses(forceUpdate = false) {
        if (!forceUpdate && this.#cachedProcessNames.length > 0) {
            return this.#cachedProcessNames;
        }

        /**
         * Warmup PM2.
         *
         * This is done because if a PM2 daemon does not exist,
         * we don't really get a proper response for the following command.
         */
        await this.#execAsync('pm2 ping');

        const pm2Processes = await this.#execAsync('pm2 jlist');
        if (pm2Processes === '[]') {
            // return from here as there are no instances registered.
            return [];
        }

        const processes = JSON.parse(pm2Processes)
            .filter(({pm2_env: {args}}) => args && args.some(arg => arg === this.#ghoslerInstanceTypeIdentifier))
            .map(({pid, name, pm2_env: {pm_cwd, status}}) => ({pid, name, path: pm_cwd, status}));

        this.#cachedProcessNames = processes;

        return processes;
    }

    /**
     * Checks if a specified application instance is online and operational.
     *
     * @param {string} name - The name of the application instance to check.
     * @returns {Promise<boolean>} - A promise that resolves to true if online, false otherwise.
     */
    static async #checkIfAppOnline(name) {
        await Utils.sleep(10000);
        const processes = await this.#listProcesses();
        const process = processes.find(process => process.name === name);
        return process && process.status === 'online';
    }

    /**
     * Generates a unique name for a new instance by checking existing processes.
     *
     * @param {string} baseName - The base name for the new instance.
     * @returns {Promise<string>} - A promise that resolves to a unique name for the instance & whether duplicates were found.
     */
    static async #generateUniqueName(baseName) {
        let maxSuffix = 0;
        const existingProcesses = await this.#listProcesses();

        existingProcesses.forEach(process => {
            if (process.name.startsWith(`${baseName}-`)) {
                const suffix = parseInt(process.name.substring(baseName.length + 1), 10);
                if (!isNaN(suffix) && suffix > maxSuffix) {
                    maxSuffix = suffix;
                }
            }
        });

        if (maxSuffix === 0 && !existingProcesses.some(process => process.name === baseName)) {
            return baseName;
        } else {
            return `${baseName}-${maxSuffix + 1}`;
        }
    }

    /**
     * Executes a shell command asynchronously and returns only the stdout as a string.
     *
     * @param {string} command - The shell command to be executed.
     * @returns {Promise<string>} - A promise that resolves with the command's stdout.
     */
    static async #execAsync(command) {
        const {stdout} = await this.#exec(command);
        return stdout;
    }
}