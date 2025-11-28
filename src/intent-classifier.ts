export type IntentType = 'explain' | 'implement' | 'refactor' | 'debug' | 'test' | 'analyze';
export type ScopeType = 'single_file' | 'multi_file' | 'whole_project';

export interface Intent {
    intent: IntentType;
    scope: ScopeType;
    entities: string[];
    confidence: number;
}

const INTENT_PATTERNS = {
    explain: [
        /what (is|are|does)/i,
        /how (does|do|is|are)/i,
        /show me/i,
        /tell me about/i,
        /explain/i,
        /describe/i,
        /where (is|are)/i
    ],
    implement: [
        /add\s+/i,
        /create\s+/i,
        /implement/i,
        /build\s+/i,
        /make\s+/i,
        /write\s+(a|an|the)\s+/i
    ],
    refactor: [
        /refactor/i,
        /improve/i,
        /optimize/i,
        /clean\s*up/i,
        /restructure/i,
        /reorganize/i
    ],
    debug: [
        /fix\s+(the\s+)?bug/i,
        /debug/i,
        /why\s+(is|does|are)/i,
        /error/i,
        /not\s+working/i,
        /broken/i
    ],
    test: [
        /test/i,
        /verify/i,
        /check\s+if/i,
        /run\s+tests?/i
    ],
    analyze: [
        /analyze/i,
        /review/i,
        /audit/i,
        /assess/i,
        /evaluate/i
    ]
};

export function classifyIntent(message: string): Intent {
    let intent: IntentType = 'analyze';
    let maxScore = 0;

    for (const [intentType, patterns] of Object.entries(INTENT_PATTERNS)) {
        const score = patterns.filter(pattern => pattern.test(message)).length;
        if (score > maxScore) {
            maxScore = score;
            intent = intentType as IntentType;
        }
    }

    const entities = extractEntities(message);
    const scope = determineScope(message, entities);
    const confidence = maxScore > 0 ? Math.min(maxScore / 3, 1.0) : 0.5;

    return { intent, scope, entities, confidence };
}

function extractEntities(message: string): string[] {
    const entities: string[] = [];

    const pathPattern = /[\w\/\-]+\/[\w\-]+\.[\w]+/g;
    const pathMatches = message.match(pathPattern);
    if (pathMatches) {
        entities.push(...pathMatches);
    } else {
        const filePattern = /[\w\-]+\.[\w]+(?:\.[\w]+)?/g;
        const fileMatches = message.match(filePattern);
        if (fileMatches) {
            entities.push(...fileMatches.filter(f => f.split('.').length <= 3));
        }
    }

    const classPattern = /\b[A-Z][a-zA-Z]+\b/g;
    const classMatches = message.match(classPattern);
    if (classMatches) {
        entities.push(...classMatches.filter(name =>
            !['Add', 'Create', 'Fix', 'Test', 'Debug', 'Refactor', 'Implement', 'Show', 'Tell', 'Explain'].includes(name)
        ));
    }

    return [...new Set(entities)];
}

function determineScope(message: string, entities: string[]): ScopeType {
    const fileEntities = entities.filter(e => e.includes('.') || e.includes('/'));

    if (fileEntities.length === 0) {
        const wholeProjectKeywords = [
            /application/i,
            /project/i,
            /codebase/i,
            /system/i,
            /entire/i,
            /all\s+files?/i
        ];

        if (wholeProjectKeywords.some(pattern => pattern.test(message))) {
            return 'whole_project';
        }
        return 'whole_project';
    }

    if (fileEntities.length === 1) {
        return 'single_file';
    }

    return 'multi_file';
}
