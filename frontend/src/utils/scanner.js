// AI-Powered Phishing File Scanner
// Ported from the HTML implementation

// Phishing and malware detection patterns
const phishingPatterns = {
  suspiciousTlds: ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz', '.top', '.club', '.online', '.site', '.space', '.website'],
  urlShorteners: ['bit.ly', 'tinyurl.com', 'goo.gl', 't.co', 'ow.ly', 'buff.ly', 'adf.ly', 'is.gd', 'v.gd', 'tiny.cc'],
  suspiciousKeywords: ['login', 'password', 'verify', 'account', 'security', 'bank', 'paypal', 'amazon', 'update', 'confirm'],
  macroKeywords: ['autoopen', 'autoclose', 'document_open', 'document_close', 'vba', 'macro', 'shell', 'exec', 'run'],
  encodedContent: ['eval(', 'base64', 'atob(', 'btoa(', 'unescape(', 'decodeURIComponent('],
  suspiciousExtensions: ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com', '.vbs', '.js', '.jar', '.hta']
};

export const scanFileForThreats = async (file) => {
  const results = {
    threats: [],
    warnings: [],
    score: 0,
    risk: 'low'
  };

  try {
    // Read file content
    const content = await readFileContent(file);
    const fileName = file.name.toLowerCase();

    // Check filename for suspicious patterns
    if (phishingPatterns.suspiciousExtensions.some(ext => fileName.endsWith(ext))) {
      results.threats.push({
        type: 'suspicious_extension',
        severity: 'high',
        message: `File has suspicious extension: ${file.name.split('.').pop()}`
      });
      results.score += 30;
    }

    // Check for phishing URLs
    const urls = extractUrls(content);
    for (const url of urls) {
      const urlAnalysis = analyzeUrl(url);
      if (urlAnalysis.risk === 'high') {
        results.threats.push({
          type: 'phishing_url',
          severity: 'high',
          message: `Suspicious URL detected: ${url}`,
          details: urlAnalysis.reasons
        });
        results.score += 25;
      } else if (urlAnalysis.risk === 'medium') {
        results.warnings.push({
          type: 'suspicious_url',
          severity: 'medium',
          message: `Potentially suspicious URL: ${url}`,
          details: urlAnalysis.reasons
        });
        results.score += 10;
      }
    }

    // Check for macro malware
    const macroAnalysis = detectMacros(content, fileName);
    if (macroAnalysis.hasMacros) {
      results.threats.push({
        type: 'macro_malware',
        severity: 'high',
        message: 'File contains potentially malicious macros',
        details: macroAnalysis.details
      });
      results.score += 40;
    }

    // Check for suspicious patterns
    const patternAnalysis = detectSuspiciousPatterns(content);
    for (const pattern of patternAnalysis) {
      if (pattern.severity === 'high') {
        results.threats.push(pattern);
        results.score += 20;
      } else {
        results.warnings.push(pattern);
        results.score += 5;
      }
    }

    // Check file size anomalies
    if (file.size > 50 * 1024 * 1024) { // 50MB
      results.warnings.push({
        type: 'large_file',
        severity: 'low',
        message: 'Unusually large file size may indicate packed malware'
      });
      results.score += 5;
    }

    // Determine overall risk level
    if (results.score >= 50) {
      results.risk = 'high';
    } else if (results.score >= 20) {
      results.risk = 'medium';
    } else {
      results.risk = 'low';
    }

    return results;

  } catch (error) {
    console.error('Scan error:', error);
    return {
      threats: [],
      warnings: [],
      score: 0,
      risk: 'unknown',
      error: 'Failed to scan file: ' + error.message
    };
  }
};

const readFileContent = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // For text files, read as text
    if (file.type.startsWith('text/') ||
        file.name.endsWith('.txt') ||
        file.name.endsWith('.html') ||
        file.name.endsWith('.htm') ||
        file.name.endsWith('.xml') ||
        file.name.endsWith('.json')) {
      reader.readAsText(file);
    } else {
      // For binary files, read as array buffer and try to extract text
      reader.readAsArrayBuffer(file);
    }

    reader.onload = (e) => {
      if (file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.html') ||
          file.name.endsWith('.htm') ||
          file.name.endsWith('.xml') ||
          file.name.endsWith('.json')) {
        resolve(e.target.result);
      } else {
        // Try to extract text from binary data
        const buffer = e.target.result;
        const bytes = new Uint8Array(buffer);
        let text = '';

        // Look for printable ASCII characters
        for (let i = 0; i < Math.min(bytes.length, 10000); i++) {
          if (bytes[i] >= 32 && bytes[i] <= 126) {
            text += String.fromCharCode(bytes[i]);
          } else if (bytes[i] === 10 || bytes[i] === 13) {
            text += String.fromCharCode(bytes[i]);
          }
        }

        resolve(text);
      }
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

const extractUrls = (content) => {
  const urlRegex = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s<>"']*)/g;
  const urls = content.match(urlRegex) || [];
  return [...new Set(urls)]; // Remove duplicates
};

const analyzeUrl = (url) => {
  const analysis = {
    risk: 'low',
    reasons: []
  };

  try {
    // Parse URL
    let urlObj;
    if (url.startsWith('http')) {
      urlObj = new URL(url);
    } else {
      urlObj = new URL('http://' + url);
    }

    const domain = urlObj.hostname.toLowerCase();
    const path = urlObj.pathname.toLowerCase();

    // Check for suspicious TLDs
    const tld = '.' + domain.split('.').pop();
    if (phishingPatterns.suspiciousTlds.includes(tld)) {
      analysis.reasons.push('Suspicious top-level domain');
      analysis.risk = 'high';
    }

    // Check for URL shorteners
    if (phishingPatterns.urlShorteners.some(shortener => domain.includes(shortener))) {
      analysis.reasons.push('URL shortener service');
      analysis.risk = 'medium';
    }

    // Check for suspicious keywords in domain
    if (phishingPatterns.suspiciousKeywords.some(keyword =>
        domain.includes(keyword) || path.includes(keyword))) {
      analysis.reasons.push('Contains suspicious keywords');
      if (analysis.risk === 'low') analysis.risk = 'medium';
    }

    // Check for IP addresses
    const ipRegex = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
    if (ipRegex.test(domain)) {
      analysis.reasons.push('Uses IP address instead of domain');
      analysis.risk = 'high';
    }

    // Check for long subdomains
    const subdomainParts = domain.split('.');
    if (subdomainParts.length > 3) {
      analysis.reasons.push('Unusually long subdomain chain');
      if (analysis.risk === 'low') analysis.risk = 'medium';
    }

    // Check for character repetition
    if (/(.)\1{3,}/.test(domain)) {
      analysis.reasons.push('Repeated characters in domain');
      if (analysis.risk === 'low') analysis.risk = 'medium';
    }

  } catch (error) {
    // Invalid URL format
    analysis.reasons.push('Malformed URL');
    analysis.risk = 'medium';
  }

  return analysis;
};

const detectMacros = (content, filename) => {
  const analysis = {
    hasMacros: false,
    details: []
  };

  // Check for VBA macro patterns
  if (content.includes('Sub ') || content.includes('Function ') ||
      content.includes('Private Sub') || content.includes('Public Sub')) {
    analysis.hasMacros = true;
    analysis.details.push('Contains VBA macro code');
  }

  // Check for macro keywords
  const foundMacros = phishingPatterns.macroKeywords.filter(keyword =>
    content.toLowerCase().includes(keyword.toLowerCase())
  );

  if (foundMacros.length > 0) {
    analysis.hasMacros = true;
    analysis.details.push(`Found macro keywords: ${foundMacros.join(', ')}`);
  }

  // Check file extensions that commonly contain macros
  if (filename.endsWith('.docm') || filename.endsWith('.xlsm') ||
      filename.endsWith('.pptm') || filename.endsWith('.doc') ||
      filename.endsWith('.xls') || filename.endsWith('.ppt')) {
    analysis.details.push('File type commonly contains macros');
    // Don't automatically set hasMacros=true for all office files
  }

  return analysis;
};

const detectSuspiciousPatterns = (content) => {
  const patterns = [];

  // Check for encoded content
  const encodedPatterns = phishingPatterns.encodedContent.filter(pattern =>
    content.includes(pattern)
  );

  if (encodedPatterns.length > 0) {
    patterns.push({
      type: 'encoded_content',
      severity: 'high',
      message: 'File contains encoded or obfuscated content',
      details: `Found patterns: ${encodedPatterns.join(', ')}`
    });
  }

  // Check for suspicious file signatures or headers
  if (content.includes('MZ') && content.includes('\x90\x90')) {
    patterns.push({
      type: 'executable_content',
      severity: 'high',
      message: 'File contains executable code patterns'
    });
  }

  // Check for very long lines (often indicate obfuscated code)
  const lines = content.split('\n');
  const longLines = lines.filter(line => line.length > 1000);
  if (longLines.length > 0) {
    patterns.push({
      type: 'suspicious_formatting',
      severity: 'medium',
      message: 'File contains unusually long lines that may indicate obfuscation'
    });
  }

  // Check for high entropy (random-like content)
  const entropy = calculateEntropy(content);
  if (entropy > 7.5) { // High entropy suggests compressed/encrypted content
    patterns.push({
      type: 'high_entropy',
      severity: 'medium',
      message: 'File has high entropy, possibly containing compressed or encrypted data'
    });
  }

  return patterns;
};

const calculateEntropy = (str) => {
  const len = str.length;
  const freq = {};

  for (let i = 0; i < len; i++) {
    const char = str[i];
    freq[char] = (freq[char] || 0) + 1;
  }

  let entropy = 0;
  for (const char in freq) {
    const p = freq[char] / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
};

export const displayScanResults = (results, containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  let html = '<div class="scan-results">';

  // Risk level indicator
  const riskColors = {
    low: '#10b981',
    medium: '#f59e0b',
    high: '#ef4444',
    unknown: '#6b7280'
  };

  html += `
    <div class="scan-summary" style="background: ${riskColors[results.risk]}; color: white; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
      <h4 style="margin: 0 0 0.5rem 0;">🔍 Scan Results: ${results.risk.toUpperCase()} RISK</h4>
      <p style="margin: 0; opacity: 0.9;">Threat Score: ${results.score}/100</p>
    </div>
  `;

  // Threats
  if (results.threats.length > 0) {
    html += '<div class="scan-threats" style="margin-bottom: 1rem;">';
    html += '<h5 style="color: #ef4444; margin-bottom: 0.5rem;">🚨 Threats Detected:</h5>';
    results.threats.forEach(threat => {
      html += `
        <div class="threat-item" style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem;">
          <strong>${threat.message}</strong>
          ${threat.details ? `<br><small style="color: #991b1b;">${threat.details}</small>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  // Warnings
  if (results.warnings.length > 0) {
    html += '<div class="scan-warnings" style="margin-bottom: 1rem;">';
    html += '<h5 style="color: #f59e0b; margin-bottom: 0.5rem;">⚠️ Warnings:</h5>';
    results.warnings.forEach(warning => {
      html += `
        <div class="warning-item" style="background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 0.75rem; margin-bottom: 0.5rem;">
          <strong>${warning.message}</strong>
          ${warning.details ? `<br><small style="color: #92400e;">${warning.details}</small>` : ''}
        </div>
      `;
    });
    html += '</div>';
  }

  // Clean result
  if (results.threats.length === 0 && results.warnings.length === 0) {
    html += `
      <div class="scan-clean" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 1rem; text-align: center;">
        <div style="font-size: 2rem; margin-bottom: 0.5rem;">✅</div>
        <strong style="color: #166534;">File appears clean</strong>
        <p style="margin: 0.5rem 0 0 0; color: #166534;">No suspicious patterns detected</p>
      </div>
    `;
  }

  html += '</div>';
  container.innerHTML = html;
};