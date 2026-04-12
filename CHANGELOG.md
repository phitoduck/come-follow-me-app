# Changelog

## 0.2.0 — Ministering Tracker

Replaced the Come Follow Me goal-tracking survey with a simplified ministering tracker.
Members now record occasions when they felt supported or ministered to by ward members.

### Changed

- **Submit tab**: Removed the two yes/no questions. Users select their organization and tap a single "I Was Ministered To" button.
- **Reports tab**: Replaced the two bar charts with a single chart showing ministering event counts by organization.
- **Stories tab**: Updated placeholder text to reflect ministering theme. Functionality unchanged.
- **Backend API**: New `/ministering/` and `/ministering/reports` endpoints replace `/survey/` and `/survey/reports`.
- **Google Sheets**: New `ministering_events` worksheet (columns: `datetime_submitted`, `organization`). Old `surveys` worksheet preserved but no longer used.

## 0.1.0 — Come Follow Me Tracker

Initial release. Weekly survey tracking Come Follow Me goals and progress by organization,
with anonymous story sharing.
