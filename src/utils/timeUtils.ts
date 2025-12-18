
export function formatInGameTime(totalMinutes: number): string {
    // Config: Day starts at 8:00 AM (480 minutes)
    const START_HOUR = 8;
    const START_MINUTES = 0;
    const BASE_OFFSET = (START_HOUR * 60) + START_MINUTES;

    const currentTotal = BASE_OFFSET + totalMinutes;

    const MINUTES_PER_DAY = 24 * 60;
    const day = Math.floor(currentTotal / MINUTES_PER_DAY) + 1;

    const minutesInDay = currentTotal % MINUTES_PER_DAY;
    const hour = Math.floor(minutesInDay / 60);
    const minute = minutesInDay % 60;

    // Format with leading zeros
    const hourStr = hour.toString().padStart(2, '0');
    const minuteStr = minute.toString().padStart(2, '0');

    // Optional: AM/PM format
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12; // Convert 0 to 12

    // Return format: "Day 1, 08:30 AM"
    return `Day ${day}, ${hourStr}:${minuteStr} ${period}`;
}

export function getTimeUntilNextLongRest(timeSinceLastRest: number): string {
    const cooldown = 1440; // 24 hours in minutes
    const remaining = Math.max(0, cooldown - timeSinceLastRest);
    if (remaining <= 0) return "Available Now";

    const hours = Math.ceil(remaining / 60);
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
