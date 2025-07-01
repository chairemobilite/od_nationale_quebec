/**
 * TODO Move to Evolution as an 8DigitsAccessCodeFormatter
 * @param input The input to format
 * @returns The formatted access code
 */
export const formatAccessCode = (input: string) => {
    input = input.replaceAll('_', '-'); // change _ to -
    input = input.replace(/[^-\d]/g, ''); // Remove everything but numbers and -
    // Get only the digits
    const digits = input.replace(/\D+/g, '');

    // If we have at least 8 digits, format the first 8 as access code
    if (digits.length >= 8) {
        return digits.slice(0, 4) + '-' + digits.slice(4, 8);
    }

    // For less than 8 digits, return as is (already cleaned of non-allowed chars)
    return input.slice(0, 9);
};
