import * as vscode from "vscode"
import { TerminalContext } from "../context"

export interface TerminalOptions extends vscode.TerminalOptions {
  context?: TerminalContext
}
