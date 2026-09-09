import type { Reporter, Test, TestCaseResult } from "@jest/reporters";
import chalk, { type Chalk } from "chalk";


export default class InlineTestReporter implements Reporter
{

  onTestCaseResult(test: Test, testCaseResult: TestCaseResult): void
  {
    const ancestorTitles = testCaseResult.ancestorTitles;
    const hierarchy = ancestorTitles.length > 0 ? `${ancestorTitles.join(" > ")} > ` : "";
    const duration = testCaseResult.duration;
    const formattedDuration = duration !== null && duration !== undefined ? ` (${Math.round(duration)} ms)` : "";

    let statusText: string;
    let statusSymbol: string;
    let chalkColor: Chalk;
    switch (testCaseResult.status)
    {
      case "passed":
        statusText = "success";
        chalkColor = chalk.green;
        statusSymbol = "✓";
        break;
      case "failed":
        statusText = "failure";
        chalkColor = chalk.red;
        statusSymbol = "✕";
        break;
      case "skipped":
      case "pending":
        statusText = "skipped";
        chalkColor = chalk.yellow;
        statusSymbol = "○";
        break;
      case "todo":
        statusText = "todo";
        chalkColor = chalk.magenta;
        statusSymbol = "✎";
        break;
      default:
        statusText = "unknown";
        chalkColor = chalk.dim;
        statusSymbol = "•";
        break;
    }

    console.log(`\n=> ${chalkColor(`[${statusText}] ${statusSymbol}`)} ${hierarchy}${chalk.bold(testCaseResult.title)}${chalk.dim(formattedDuration)}\n`);

    if (testCaseResult.status === "failed" && testCaseResult.failureMessages.length > 0)
    {
      for (const failureMessage of testCaseResult.failureMessages)
      {
        console.log(chalk.red(failureMessage));
      }
    }
  }

}
