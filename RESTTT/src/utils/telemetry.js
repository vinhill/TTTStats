
class TelemetryABC {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }

    getName() { return this.name; }

    getType() { return this.type; }
}

class Counter extends TelemetryABC {
    constructor(name, value = 0) {
        super(name, "Counter");
        this.value = value;
    }

    increment() { this.value++; }

    getValue() { return this.value; }

    decrement() { this.value--; }

    add(value) { this.value += value; }
}

class Collection extends TelemetryABC {
    constructor(name) {
        super(name, "Collection");
        this.collection = new Map();
    }

    add(item) { this.collection.set(item, this.getCount(item) + 1); }

    getCount(item) { return this.collection.get(item) || 0; }

    has(item) { return this.collection.has(item); }
}

function percentile(sorted, p) {
    const idx = Math.round(sorted.length * p);
    return sorted[idx];
}

class NumericSeries extends TelemetryABC {
    constructor(name) {
        super(name, "NumericSeries");
        this.series = [];
    }

    add(value) {
        this.series.push(value);
        this.dirty = true;
    }

    mean() {
        return this.series.reduce((a, b) => a + b, 0) / this.series.length;
    }

    len() { return this.series.length; }

    representativeElements() {
        const sorted = this.series.sort((a, b) => a - b);
        
        return {
            median: percentile(sorted, 0.5),
            p90: percentile(sorted, 0.9),
            p10: percentile(sorted, 0.1),
            p25: percentile(sorted, 0.25),
            p75: percentile(sorted, 0.75),
            max: sorted[sorted.length - 1],
            min: sorted[0],
        }
    }

    topn(n) {
        // n most frequent elements
        const counts = new Map();
        for (const item of this.series) {
            counts.set(item, counts.get(item) + 1 || 1);
        }

        const sortedCounts = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const topn = sortedCounts.slice(0, n);
        return topn.map(item => item[0])
    }
}

class TelemetryService {
    constructor() {
        this.telemetries = new Map();
    }

    get(name) {
        return this.telemetries.get(name);
    }

    add(telemetry) {
        this.telemetries.set(telemetry.getName(), telemetry);
    }

    getReport() {
        let report = {};

        for (const [name, telemetry] of this.telemetries) {
            if (telemetry.getType() === "Counter") {
                report[name] = telemetry.getValue();
            } else if (telemetry.getType() === "Collection") {
                report[name] = Array.from(telemetry.collection.keys());
            } else if (telemetry.getType() === "NumericSeries") {
                report[name] = {
                    mean: telemetry.mean(),
                    len: telemetry.len(),
                    representativeElements: telemetry.representativeElements(),
                    top5: telemetry.topn(5)
                }
            }
        }

        return report;
    }
}

const telemetry = new TelemetryService();
telemetry.add(new NumericSeries("DB_CheckAlive_Duration"));
telemetry.add(new NumericSeries("DB_Query_Duration"));

function getTelemetry(name) {
    return telemetry.get(name);
}

module.exports = {
    get: getTelemetry,
    report: () => telemetry.getReport(),
}