const dns = require('dns').promises;
const { Resolver } = require('dns');
const fetch = require('node-fetch');

// Expanded patterns for Google MX detection
const GOOGLE_MX_PATTERNS = [
    /^aspmx\.l\.google\.com$/i,
    /^alt[0-9]?\.aspmx\.l\.google\.com$/i,
    /^aspmx[0-9]\.googlemail\.com$/i,
    /^alt[0-9]\.aspmx\.l\.googlemail\.com$/i,
    /^smtp\.google\.com$/i,
    /^gmail-smtp-in\.l\.google\.com$/i,
    /^mx\.google\.com$/i,
    /^gmr-smtp-in\.l\.google\.com$/i,
    /^.*googlemail\.com$/i,
    /^.*google-mail\.com$/i
];

// Google IP address ranges (partial)
const GOOGLE_IP_CIDR_BLOCKS = [
    '64.18.0.0/20',      // Google
    '64.233.160.0/19',   // Google
    '66.102.0.0/20',     // Google
    '66.249.80.0/20',    // Google
    '72.14.192.0/18',    // Google
    '74.125.0.0/16',     // Google
    '108.177.8.0/21',    // Google
    '173.194.0.0/16',    // Google
    '209.85.128.0/17',   // Google
    '216.58.192.0/19',   // Google
    '216.239.32.0/19'    // Google
];

// Helper function to check if IP is in CIDR block
const ipInCidr = (ip, cidr) => {
    const [range, bits = 32] = cidr.split('/');
    const mask = ~(2 ** (32 - bits) - 1);
    
    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);
    
    const ipInt = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
    const rangeInt = (rangeParts[0] << 24) | (rangeParts[1] << 16) | (rangeParts[2] << 8) | rangeParts[3];
    
    return (ipInt & mask) === (rangeInt & mask);
};

// Check if IP belongs to Google
const isGoogleIpByCidr = ip => {
    if (!ip || !ip.includes('.')) return false;
    return GOOGLE_IP_CIDR_BLOCKS.some(cidr => ipInCidr(ip, cidr));
};

const RESOLVER_TIMEOUT = 3000;
const MX_CACHE = new Map();
const CACHE_TTL = 3600000; // 1 hour
const MAX_CACHE_SIZE = 1000;
const MAX_CONCURRENT_LOOKUPS = 5;
let activeRequests = 0;
const pendingRequests = [];

const acquireLock = () => {
    return new Promise(resolve => {
        if (activeRequests < MAX_CONCURRENT_LOOKUPS) {
            activeRequests++;
            resolve();
        } else {
            pendingRequests.push(resolve);
        }
    });
};

const releaseLock = () => {
    if (pendingRequests.length > 0) {
        const nextResolve = pendingRequests.shift();
        nextResolve();
    } else {
        activeRequests--;
    }
};

const cleanupCache = () => {
    if (MX_CACHE.size > MAX_CACHE_SIZE) {
        const entries = [...MX_CACHE.entries()];
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
        
        for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
            MX_CACHE.delete(entries[i][0]);
        }
    }
};

const isGoogleIp = async ip => {
    // First check against known Google IP ranges (fast)
    if (isGoogleIpByCidr(ip)) {
        return true;
    }
    
    // Then verify with reverse DNS (more accurate)
    try {
        const ptr = await dns.resolvePtr(ip).catch(() => []);
        if (ptr.length > 0) {
            return GOOGLE_MX_PATTERNS.some(pattern => pattern.test(ptr[0])) || 
                   ptr[0].includes('google') || 
                   ptr[0].includes('googlemail');
        }
        return false;
    } catch {
        return false;
    }
};

const getMxRecords = async domain => {
    const results = new Map();
    
    const googleResolver = new Resolver();
    googleResolver.setServers(['8.8.8.8']);
    
    const cloudflareResolver = new Resolver();
    cloudflareResolver.setServers(['1.1.1.1']);
    
    const resolvers = [
        { 
            resolve: () => dns.resolveMx(domain).catch(() => []),
            name: 'system' 
        },
        { 
            resolve: () => new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), RESOLVER_TIMEOUT);
                googleResolver.resolveMx(domain, (err, records) => {
                    clearTimeout(timeout);
                    if (err) reject(err);
                    else resolve(records);
                });
            }),
            name: 'google'
        },
        { 
            resolve: () => new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error('Timeout')), RESOLVER_TIMEOUT);
                cloudflareResolver.resolveMx(domain, (err, records) => {
                    clearTimeout(timeout);
                    if (err) reject(err);
                    else resolve(records);
                });
            }),
            name: 'cloudflare'
        }
    ];
    
    const attempts = await Promise.allSettled(
        resolvers.map(resolver => resolver.resolve())
    );
    
    attempts.forEach(result => {
        if (result.status === 'fulfilled') {
            result.value.forEach(record => {
                results.set(record.exchange.toLowerCase(), record.priority);
            });
        }
    });
    
    return Array.from(results.entries())
        .map(([exchange, priority]) => ({ exchange, priority }))
        .sort((a, b) => a.priority - b.priority);
};

const resolveHostsToIp = async mxRecords => {
    const hosts = [];
    
    for (const { exchange, priority } of mxRecords) {
        try {
            const [ipv4s, ipv6s] = await Promise.all([
                dns.resolve4(exchange).catch(() => []),
                dns.resolve6(exchange).catch(() => [])
            ]);
            
            hosts.push({ 
                exchange, 
                priority, 
                addresses: [...ipv4s, ...ipv6s] 
            });
        } catch {
            continue;
        }
    }
    
    return hosts;
};

const checkSpfRecords = async domain => {
    try {
        const txtRecords = await dns.resolveTxt(domain);
        const spfRecords = txtRecords.flat().filter(txt => txt.startsWith('v=spf1'));
        
        return spfRecords.some(record => 
            record.includes('include:_spf.google.com') || 
            record.includes('include:smtp.google.com') ||
            record.includes('include:gmail.com') ||
            record.includes('include:googlemail.com') ||
            record.includes('ip4:') && record.includes('google')
        );
    } catch {
        return false;
    }
};

const checkDmarcRecords = async domain => {
    try {
        const txtRecords = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
        return txtRecords.flat().some(txt => 
            txt.includes('google') || 
            txt.includes('gmail')
        );
    } catch {
        return false;
    }
};

const checkGoogleWorkspace = async domain => {
    try {
        // Check for Google Workspace verification records
        const txtRecords = await dns.resolveTxt(domain).catch(() => []);
        return txtRecords.flat().some(txt => 
            txt.startsWith('google-site-verification=') || 
            txt.includes('googlehosted.com')
        );
    } catch {
        return false;
    }
};

const detectEmailProvider = async email => {
    if (!email || typeof email !== 'string') {
        return { result: 'Not Google', provider: 'invalid' };
    }
    
    const emailRegex = /^[^\s@]+@([^\s@]+)$/;
    const match = email.match(emailRegex);
    
    if (!match) {
        return { result: 'Not Google', provider: 'invalid' };
    }
    
    const domain = match[1].toLowerCase();
    
    // Check cache first
    if (MX_CACHE.has(domain)) {
        const cached = MX_CACHE.get(domain);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.result;
        }
        MX_CACHE.delete(domain);
    }
    
    // Known Google domains for immediate classification
    const googleDomains = [
        'gmail.com', 
        'googlemail.com', 
        'google.com',
        'google.co.uk',
        'google.co.in',
        'google.ca',
        'google.fr',
        'google.de'
    ];
    
    if (googleDomains.includes(domain)) {
        const result = { result: 'Google', provider: 'Google Gmail' };
        MX_CACHE.set(domain, { result, timestamp: Date.now() });
        cleanupCache();
        return result;
    }

    // Acquire concurrency lock
    await acquireLock();
    
    try {
        // Double-check cache (might have been populated while waiting for lock)
        if (MX_CACHE.has(domain)) {
            const cached = MX_CACHE.get(domain);
            if (Date.now() - cached.timestamp < CACHE_TTL) {
                releaseLock();
                return cached.result;
            }
            MX_CACHE.delete(domain);
        }
        
        // Multi-method detection strategy
        const detectionResults = {
            mxMatch: false,
            spfMatch: false,
            dmarcMatch: false,
            ipMatch: false,
            workspaceMatch: false
        };
        
        // Step 1: Get MX records from all resolvers
        const mxRecords = await getMxRecords(domain);
        
        if (mxRecords.length === 0) {
            const result = { result: 'Not Google', provider: domain };
            MX_CACHE.set(domain, { result, timestamp: Date.now() });
            cleanupCache();
            return result;
        }
        
        // Step 2: Check for Google MX patterns
        detectionResults.mxMatch = mxRecords.some(record => 
            GOOGLE_MX_PATTERNS.some(pattern => pattern.test(record.exchange))
        );
        
        if (detectionResults.mxMatch) {
            const result = { result: 'Google', provider: `${domain} (Google Workspace)` };
            MX_CACHE.set(domain, { result, timestamp: Date.now() });
            cleanupCache();
            return result;
        }
        
        // Step 3: Check SPF records
        detectionResults.spfMatch = await checkSpfRecords(domain);
        
        // Check DMARC records for Google references
        detectionResults.dmarcMatch = await checkDmarcRecords(domain);
        
        // Check Google Workspace verification
        detectionResults.workspaceMatch = await checkGoogleWorkspace(domain);
        
        // If any of those checks are positive, it's likely Google
        if (detectionResults.spfMatch || detectionResults.dmarcMatch || detectionResults.workspaceMatch) {
            const result = { result: 'Google', provider: `${domain} (Google Workspace)` };
            MX_CACHE.set(domain, { result, timestamp: Date.now() });
            cleanupCache();
            return result;
        }
        
        // Step 4: Resolve MX to IPs and check reverse DNS
        const hosts = await resolveHostsToIp(mxRecords);
        
        for (const host of hosts) {
            for (const ip of host.addresses) {
                if (await isGoogleIp(ip)) {
                    detectionResults.ipMatch = true;
                    const result = { result: 'Google', provider: `${domain} (Google Workspace)` };
                    MX_CACHE.set(domain, { result, timestamp: Date.now() });
                    cleanupCache();
                    return result;
                }
            }
        }
        
        // If all checks fail, it's not Google
        const provider = domain.split('.').length >= 2 ? 
            domain.split('.')[domain.split('.').length - 2] : domain;
            
        const result = { result: 'Not Google', provider };
        MX_CACHE.set(domain, { result, timestamp: Date.now() });
        cleanupCache();
        return result;
        
    } catch (error) {
        console.error(`Error detecting provider for ${domain}:`, error);
        const result = { result: 'Not Google', provider: domain };
        return result;
    } finally {
        releaseLock();
    }
};

module.exports = { detectEmailProvider }; 