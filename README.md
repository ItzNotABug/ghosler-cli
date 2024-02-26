## Ghosler CLI

This is a `CLI` project for managing [Ghosler](https://github.com/itznotabug/ghosler).

### Pre-requisites

1. `PM2`
2. `Node 18^`

Ghosler-CLI uses `PM2` as a process manager to handle `Ghosler`.

### Install

```npm
npm i ghosler-cli -g
```

### Commands

| Command             | Description                                                                                                                         |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `ghosler ls`        | List all the registered processes with `PM2`.                                                                                       |
| `ghosler install`   | Install Ghosler from its GitHub source.<br>Branch: `release`, `master` or `name-of-the-branch`. Default: `release`.                 |
| `ghosler update`    | Check and update Ghosler if available.                                                                                              |
| `ghosler restart`   | Restart Ghosler if you made any changes to source.                                                                                  |
| `ghosler flush`     | Flush all of Ghosler Logs.                                                                                                          |
| `ghosler backup`    | Backup Ghosler instance (Directory backup).                                                                                         |
| `ghosler uninstall` | Remove Ghosler, its all data and configurations completely.<br/> **Note: Download your local backups before uninstalling Ghosler.** |
| `ghosler logs`      | Print logs for Ghosler.<br>Option: `--type` where values can be `error`, `out`. Default: `out`.                                     |

Note: If there are multiple processes, you must specify the process/instance name to perform any of the above
operations.

Examples:

1. `ghosler restart --name xyz-site-com`.
2. `ghosler install --branch feature-branch-name`.
3. `ghosler logs --name xyz-site-com --type error`.