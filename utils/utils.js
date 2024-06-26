import fs from 'fs';
import ora from 'ora';
import path from 'path';
import detect from 'detect-port';
import extract from 'extract-zip';
import {writeFile} from 'fs/promises';
import PM2Manager from './pm2/manager.js';

/**
 * A utility class.
 */
export default class Utils {

    // Our `ora` spinner.
    static #spinner = ora({color: 'white', spinner: 'dots'});

    // Temporary directory for processing.
    static #tempDirectory = '.temp';

    // Full path to the downloaded Ghosler archive.
    static #fullArchivePath = `${this.#tempDirectory}/ghosler-latest.zip`;

    /**
     * The version of ghosler-cli.
     *
     * @type {string}
     */
    static cliPackageVersion = '1.0.90';
    // Urls to download Ghosler from its GitHub source.
    static ghoslerReleaseUrl = 'https://api.github.com/repos/itznotabug/ghosler/releases/latest';
    static ghoslerReleaseDownloadUrl = 'https://github.com/itznotabug/ghosler/archive/refs/tags/{version}.zip';
    static ghoslerBranchDownloadUrl = 'https://github.com/ItzNotABug/ghosler/archive/refs/heads/{branch-name}.zip';

    /**
     * Start the spinner with a log message.
     *
     * @param message - The log message to print.
     */
    static logStart(message) {
        this.#spinner.start(message);
    }

    /**
     * Print a fail message & complete spinner.
     *
     * @param message - The log message to print.
     */
    static logFail(message) {
        this.#spinner.fail(message);
    }

    /**
     * Print a success message & complete spinner.
     *
     * @param message - The log message to print.
     */
    static logSucceed(message) {
        this.#spinner.succeed(message);
    }

    /**
     * Print a warning message.
     *
     * @param message - The log message to print.
     */
    static logWarn(message) {
        this.#spinner.warn(message);
    }

    /**
     * Delays execution for a specified number of milliseconds.
     *
     * @param {number} ms - The number of milliseconds to wait.
     * @returns {Promise<void>} - A promise that resolves after the specified delay.
     */
    static sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * Converts the given version into a comparable integer.
     *
     * @param {string} version - The version in string format.
     * @returns {number} - The integer version of the provided string format.
     */
    static versionToInt = (version) => parseInt(version.replace(/\./g, ''), 10);

    /**
     * Clones the Ghosler repository with the latest release version.
     *
     * @param {string} branch - The branch to install Ghosler from.
     * @returns {Promise<{success: boolean, message: string}>} - The result of the cloning operation, including a success flag and a message.
     */
    static async cloneGhosler(branch = 'release') {
        if (!branch) {
            return {
                success: false,
                message: 'Branch name cannot be empty. Can either be `release`, `master` or the actual branch name.'
            };
        }

        try {
            // setup.
            if (!fs.existsSync(this.#tempDirectory)) fs.mkdirSync(this.#tempDirectory);
            if (fs.existsSync(this.#fullArchivePath)) fs.unlinkSync(this.#fullArchivePath);

            let zipDownloadUrl = '';

            if (branch === 'release') {
                const latestVersion = await this.latestReleaseVersion();
                if (latestVersion === 'na') return {success: false, message: 'Unable to check for the latest version!'};
                zipDownloadUrl = this.ghoslerReleaseDownloadUrl.replace('{version}', latestVersion);
            } else {
                zipDownloadUrl = this.ghoslerBranchDownloadUrl.replace('{branch-name}', branch);
            }

            const response = await fetch(zipDownloadUrl);
            if (response.status !== 200) {
                // we don't need a '.temp' directory.
                if (fs.existsSync(this.#tempDirectory)) {
                    fs.rmSync(this.#tempDirectory, {recursive: true});
                }

                return {
                    success: false,
                    message: `Branch '${branch}' not found!`
                };
            }

            const buffer = Buffer.from(await response.arrayBuffer());
            await writeFile(this.#fullArchivePath, buffer);

            return {success: true, message: 'Cloning complete.'};
        } catch (error) {
            return {success: false, message: error};
        }
    }

    /**
     * Extracts the Ghosler application to a specified target path.
     *
     * @param {string} [targetPath=process.cwd()] - The path where the application should be extracted.
     * @returns {Promise<{success: boolean, message: string}>} - The result of the extraction operation.
     */
    static async extractGhosler(targetPath = process.cwd()) {
        try {
            if (!fs.existsSync(targetPath)) fs.mkdirSync(targetPath);

            await extract(this.#fullArchivePath, {dir: targetPath});

            // Identify the extracted directory (assuming it starts with 'project-')
            const directories = fs.readdirSync(targetPath, {withFileTypes: true})
                .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('ghosler-'))
                .map(dirent => dirent.name);

            if (directories.length === 0) {
                return {success: false, message: 'No project directory found after extraction.'};
            }

            if (directories.length > 1) {
                return {success: false, message: 'Multiple project directories found, unsure which one to use'};
            }

            const extractedFolder = path.join(targetPath, directories[0]);

            const files = fs.readdirSync(extractedFolder);

            files.forEach(file => {
                const currentPath = path.join(extractedFolder, file);
                const newPath = path.join(targetPath, file);
                fs.renameSync(currentPath, newPath);
            });

            // unnecessary files, remove them.
            [
                this.#tempDirectory, extractedFolder,
                '.gitignore', 'LICENSE.md', 'README.md',
                'Dockerfile', '.dockerignore', 'docker-install.sh',
                // we don't need tailwind's build files.
                `${path.join(targetPath, 'tailwind.config.js')}`,
                `${path.join(targetPath, 'public/styles/tailwind.css')}`,
            ].forEach(file => {
                if (fs.existsSync(file)) fs.rmSync(file, {recursive: true});
            });
            return {success: true, message: 'Directory setup completed.'};
        } catch (error) {
            return {success: false, message: error};
        }
    }

    /**
     * Check if there are multiple Ghosler processes registered to PM2.
     *
     * @returns {Promise<boolean>} - A promise that resolves to `true` if multiple instances are registered, `false` otherwise.
     */
    static async hasMultipleProcesses() {
        return await PM2Manager.hasMultipleProcesses();
    }

    /**
     * Generates a formatted timestamp string.
     *
     * @returns {string} - A timestamp string formatted as 'YYYY-MM-DD_hh-mm-ss'.
     */
    static get currentDateStamp() {
        const now = new Date();
        return now.toISOString()
            .replace(/T/, '_')
            .replace(/\..+/, '')
            .replace(/:/g, '-');
    }

    /**
     * Retrieves the latest release version of the Ghosler application.
     *
     * @returns {Promise<string>} - The latest version of the Ghosler application, or 'na' if unable to retrieve.
     */
    static async latestReleaseVersion() {
        // return '0.2';
        const response = await fetch(this.ghoslerReleaseUrl);
        if (response.ok) {
            const jsonObject = await response.json();
            return jsonObject.name;
        } else return 'na';
    }

    /**
     * Retrieves the current version of Ghosler application, if installed in the given directory.
     *
     * @param {string} instancePath - The path of the ghosler instance to check for `package.json` file.
     * @returns {{message: string, status: string}} - The status of the operation & a useful message.
     */
    static currentGhoslerVersion(instancePath) {
        try {
            const packageJson = this.fileAsJson(instancePath, 'package.json');

            if (packageJson) {
                if (packageJson && packageJson.version) {
                    if (packageJson.name && packageJson.name === 'ghosler' && packageJson.version) {
                        return {
                            status: 'success',
                            message: packageJson.version
                        };
                    } else {
                        return {
                            status: 'error',
                            message: packageJson.version
                        };
                    }
                } else {
                    return {
                        status: 'error',
                        message: 'Are you sure Ghosler instance is running in this directory?'
                    };
                }
            } else {
                return {
                    status: 'error',
                    message: 'Are you sure Ghosler instance is running in this directory?'
                };
            }
        } catch (error) {
            console.error('An error occurred:', error);
            return {
                status: 'error',
                message: 'Error reading current Ghosler version.'
            };
        }
    }

    /**
     * Updates the default port and other properties in the config file of a ghosler instance.
     *
     * @param {string} branch - The branch the instance is pulled from.
     * @param {string} instanceName - The name of the to-be registered app.
     * @param {string} instancePath - The path where the app is downloaded.
     * @param {boolean} changePort - Whether to update the port in the config file.
     * @param {number} defaultPort - The default port (2369) of the app.
     * @param {boolean} isMigration - Whether this is called on a migration.
     * @returns {Promise<void>} - Nothing.
     * @throws {Error} - If there was a problem finding a usable port or editing the configuration file.
     */
    static async updateConfigurations(branch, instanceName, instancePath, changePort = true, defaultPort = 2369, isMigration = false) {
        try {
            const configFileName = 'config.production.json';
            const newConfigFileName = './configuration/config.production.json';
            let jsonContent = this.fileAsJson(instancePath, configFileName) ?? this.fileAsJson(instancePath, newConfigFileName);

            if (!jsonContent) return; // what even happened here!?

            const ghoslerConfig = jsonContent['ghosler'];

            if (isMigration) {
                if (!ghoslerConfig.branch) ghoslerConfig.branch = branch;
                if (!ghoslerConfig.instance) ghoslerConfig.instance = instanceName;
            } else {
                ghoslerConfig.branch = branch;
                ghoslerConfig.instance = instanceName;
                if (changePort) ghoslerConfig.port = await detect(defaultPort);
            }

            // just write it anyway...
            await writeFile(path.join(instancePath, configFileName), JSON.stringify(jsonContent));
        } catch (err) {
            throw err;
        }
    }

    /**
     * Retrieves the contents of the `package.json` file at the given path if one exists.
     *
     * @param {string} instancePath - The path of the ghosler instance.
     * @param {string} fileName - The name of the file to look for.
     * @returns {Object|null} - The contents of the file as parsed JSON, null if any error occurred.
     */
    static fileAsJson(instancePath, fileName) {
        try {
            const packageJsonPath = path.join(instancePath, fileName);
            if (fs.existsSync(packageJsonPath)) {
                const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
                return JSON.parse(packageJsonContent);
            } else return null;
        } catch (error) {
            console.log(error);
            return null;
        }
    }
}