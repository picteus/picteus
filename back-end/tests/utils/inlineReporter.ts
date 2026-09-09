import type { Reporter, Test, TestCaseResult, TestResult } from "@jest/reporters";
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
        statusText = "SUCCESS";
        chalkColor = chalk.green;
        statusSymbol = "✓";
        break;
      case "failed":
        statusText = "FAILURE";
        chalkColor = chalk.red;
        statusSymbol = "✕";
        break;
      case "skipped":
      case "pending":
        statusText = "SKIPPED";
        chalkColor = chalk.yellow;
        statusSymbol = "○";
        break;
      case "todo":
        statusText = "TODO";
        chalkColor = chalk.magenta;
        statusSymbol = "✎";
        break;
      default:
        statusText = "UNKNOWN";
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

  onTestResult(test: Test, testResult: TestResult): void
  {
    if (testResult.testExecError !== undefined)
    {
      console.error(chalk.red(`\n=> [FAILURE] ✕ Test suite execution error in ${test.path}:`));
      console.error(chalk.red(testResult.testExecError.message));
      if (testResult.testExecError.stack !== undefined)
      {
        console.error(chalk.red(testResult.testExecError.stack));
      }
    }
  }

}
