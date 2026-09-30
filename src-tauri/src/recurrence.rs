use crate::models::RecurringRule;
use chrono::{Datelike, Duration, NaiveDate};

/// Expand a recurring rule anchored at `anchor` into concrete occurrence
/// dates that fall within [range_start, range_end] (inclusive). Used to
/// materialize recurring deadlines/events onto the calendar view without
/// storing every future occurrence as its own row.
pub fn expand_occurrences(
    rule: &RecurringRule,
    anchor: NaiveDate,
    range_start: NaiveDate,
    range_end: NaiveDate,
) -> Vec<NaiveDate> {
    let hard_end = rule
        .end_date
        .as_ref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok())
        .map(|d| d.min(range_end))
        .unwrap_or(range_end);

    let interval = rule.interval.max(1);
    let mut occurrences = Vec::new();
    let mut count: i64 = 0;
    let max_count = rule.occurrence_count.unwrap_or(i64::MAX);

    match rule.frequency.as_str() {
        "daily" | "custom" => {
            let mut current = anchor;
            while current <= hard_end && count < max_count {
                if current >= range_start {
                    occurrences.push(current);
                }
                count += 1;
                current += Duration::days(interval);
            }
        }
        "weekly" => {
            let weekdays: Vec<u32> = rule
                .by_weekdays
                .as_ref()
                .filter(|s| !s.is_empty())
                .map(|s| s.split(',').filter_map(|n| n.trim().parse().ok()).collect())
                .unwrap_or_else(|| vec![anchor.weekday().num_days_from_sunday()]);

            let mut week_start = anchor - Duration::days(anchor.weekday().num_days_from_sunday() as i64);
            'weeks: while week_start <= hard_end {
                for &wd in &weekdays {
                    let candidate = week_start + Duration::days(wd as i64);
                    if candidate < anchor {
                        continue;
                    }
                    if candidate > hard_end || count >= max_count {
                        break 'weeks;
                    }
                    if candidate >= range_start && candidate <= range_end {
                        occurrences.push(candidate);
                    }
                    count += 1;
                }
                week_start += Duration::weeks(interval);
            }
            occurrences.sort();
        }
        "monthly" => {
            let mut year = anchor.year();
            let mut month = anchor.month();
            let day = anchor.day();
            loop {
                let candidate = last_valid_day(year, month, day);
                if candidate > hard_end || count >= max_count {
                    break;
                }
                if candidate >= range_start {
                    occurrences.push(candidate);
                }
                count += 1;
                let mut next_month = month as i32 + interval as i32;
                let mut next_year = year;
                while next_month > 12 {
                    next_month -= 12;
                    next_year += 1;
                }
                year = next_year;
                month = next_month as u32;
            }
        }
        _ => {}
    }

    occurrences
}

/// Clamp a day-of-month to whatever the target month actually has
/// (e.g. rule anchored on the 31st still fires on Feb 28th).
fn last_valid_day(year: i32, month: u32, day: u32) -> NaiveDate {
    for d in (1..=day).rev() {
        if let Some(date) = NaiveDate::from_ymd_opt(year, month, d) {
            return date;
        }
    }
    NaiveDate::from_ymd_opt(year, month, 1).expect("month always has a 1st")
}
