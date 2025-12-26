/**
 * Formula Evaluator
 * Safely evaluates stat formulas with controlled context
 */

export interface FormulaContext {
    value?: number;           // The stat value being evaluated
    damageDealt?: number;     // For lifesteal calculations
    baseDamage?: number;      // For damage modifications
    [key: string]: number | undefined;
}

/**
 * Evaluates a formula string with the given context
 * Supports basic math operations and Math functions
 * 
 * @param formula - Formula string (e.g., "value / 10", "Math.floor(value / 20)")
 * @param context - Variables available to the formula
 * @returns Evaluated result
 */
export function evaluateFormula(
    formula: string | undefined,
    context: FormulaContext
): number {
    if (!formula) return 0;

    try {
        // Create a safe Function with controlled context
        // Available variables: value, damageDealt, baseDamage, Math functions
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);

        // Create function with Math object available
        const fn = new Function(
            'Math',
            ...contextKeys,
            `return ${formula}`
        );

        const result = fn(Math, ...contextValues);

        // Ensure result is a number
        if (typeof result !== 'number' || isNaN(result)) {
            console.warn(`[FormulaEvaluator] Formula "${formula}" returned non-number:`, result);
            return 0;
        }

        return result;
    } catch (error) {
        console.error(`[FormulaEvaluator] Error evaluating formula "${formula}":`, error);
        return 0;
    }
}

/**
 * Test a formula with sample values
 * Useful for debugging and validation
 */
export function testFormula(
    formula: string,
    testCases: Array<{ input: FormulaContext; expected: number }>
): boolean {
    let allPassed = true;

    testCases.forEach(({ input, expected }, index) => {
        const result = evaluateFormula(formula, input);
        const passed = Math.abs(result - expected) < 0.001; // Allow for float precision

        if (!passed) {
            console.warn(
                `[FormulaEvaluator] Test ${index + 1} FAILED for "${formula}"`,
                `Input:`, input,
                `Expected:`, expected,
                `Got:`, result
            );
            allPassed = false;
        } else {
            console.log(
                `[FormulaEvaluator] Test ${index + 1} PASSED for "${formula}"`,
                `Input:`, input,
                `Result:`, result
            );
        }
    });

    return allPassed;
}

// Example usage and tests
if (typeof window !== 'undefined') {
    (window as any).testFormulas = () => {
        console.log('=== Testing Formula Evaluator ===');

        // Test 1: Simple division
        testFormula('value / 10', [
            { input: { value: 30 }, expected: 3 },
            { input: { value: 50 }, expected: 5 },
            { input: { value: 15 }, expected: 1.5 }
        ]);

        // Test 2: Math.floor
        testFormula('Math.floor(value / 10)', [
            { input: { value: 30 }, expected: 3 },
            { input: { value: 35 }, expected: 3 },
            { input: { value: 39 }, expected: 3 }
        ]);

        // Test 3: Percentage calculation
        testFormula('damageDealt * (value / 100)', [
            { input: { value: 10, damageDealt: 20 }, expected: 2 },
            { input: { value: 25, damageDealt: 40 }, expected: 10 },
            { input: { value: 50, damageDealt: 10 }, expected: 5 }
        ]);

        // Test 4: Complex formula
        testFormula('Math.floor(value / 5) + Math.ceil(baseDamage * 0.1)', [
            { input: { value: 23, baseDamage: 15 }, expected: 6 }, // floor(23/5) + ceil(15*0.1) = 4 + 2
            { input: { value: 30, baseDamage: 20 }, expected: 8 }  // floor(30/5) + ceil(20*0.1) = 6 + 2
        ]);

        console.log('=== Formula Tests Complete ===');
    };
}
