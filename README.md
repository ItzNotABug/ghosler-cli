## Ghosler CLI

This is a `CLI` project for managing [Ghosler](https://github.com/itznotabug/ghosler).

### Pre-requisites

1. `PM2`
2. `Node 18^`

Ghosler-CLI uses `PM2` as a process manager to handle `Ghosler`.

### Commands

| Command               | Description                                                                                                                         |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| `ghosler install`     | Install Ghosler from its GitHub source.                                                                                             |
| `ghosler update`      | Check and update Ghosler if available.                                                                                              |
| `ghosler restart`     | Restart Ghosler if you made any changes to source.                                                                                  |
| `ghosler flush`       | Flush all of Ghosler Logs.                                                                                                          |
| `ghosler backup`      | Backup Ghosler instance (Directory backup).                                                                                         |
| `ghosler uninstall`   | Remove Ghosler, its all data and configurations completely.<br/> **Note: Download your local backups before uninstalling Ghosler.** |
| `ghosler logs [type]` | Print logs for Ghosler, Type: error, out.                                                                                           |

#### Limitations

Currently, the `CLI` only supports managing a single instance of `Ghosler` on a server.