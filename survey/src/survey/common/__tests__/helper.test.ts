import { formatAccessCode } from '../helper';

describe('helper', () => {
  describe('formatAccessCode', () => {
    test.each([
      // Test case format: [description, input, expected output]
      ['formats 8 digits as XXXX-XXXX', '12345678', '1234-5678'],
      ['converts existing dashes correctly', '1234-5678', '1234-5678'],
      ['converts underscores to dashes', '1234_5678', '1234-5678'],
      ['removes letters and special characters', 'ab12cd34ef56gh78', '1234-5678'],
      ['handles mixed special characters', '12_34-ab56!78', '1234-5678'],
      ['keeps dashes but removes other special chars', '12-34-56-78', '1234-5678'],
      ['does not format if less than 8 digits', '123456', '123456'],
      ['truncates to 9 characters max', '1234567890', '1234-5678'],
      ['handles input with spaces', '1234 5678', '1234-5678'],
      ['handles input with spaces before and after', '   12 34 5678  ', '1234-5678'],
      ['handles empty string', '', ''],
      ['handles empty string', '1234db', '1234'],
      ['partial access code, 1 character', '1', '1'],
      ['partial access code, 2 characters', '12', '12'],
      ['partial access code, 3 characters', '123', '123'],
      ['partial access code, 4 characters', '1234', '1234'],
      ['partial access code, 4 characters + dash', '1234-', '1234-'],
      ['partial access code, 4 characters + dash + 2 characters', '1234-23', '1234-23'],
      ['partial access code, 5 characters', '12345', '12345'],
      ['partial access code, 6 characters', '123456', '123456'],
      ['partial access code, 7 characters', '1234567', '1234567'],
    ])('%s', (_, input, expected) => {
      expect(formatAccessCode(input)).toBe(expected);
    });
  });
});
