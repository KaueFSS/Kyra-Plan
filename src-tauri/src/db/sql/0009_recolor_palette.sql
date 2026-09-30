-- Moves colours saved with the old indigo/violet palette onto the current,
-- more neutral one, so existing blocks and events don't keep the old look.
UPDATE weekly_schedule_blocks SET color = CASE lower(color)
    WHEN '#6366f1' THEN '#2b8af7'
    WHEN '#3e7bfa' THEN '#2b8af7'
    WHEN '#8b5cf6' THEN '#5f86a6'
    WHEN '#7a6ff0' THEN '#5f86a6'
    WHEN '#a855f7' THEN '#c9557f'
    WHEN '#ec4899' THEN '#c9557f'
    WHEN '#ef4444' THEN '#d0683f'
    WHEN '#f59e0b' THEN '#c7962f'
    WHEN '#22c55e' THEN '#30a46c'
    WHEN '#14b8a6' THEN '#2aa198'
    WHEN '#38bdf8' THEN '#2b8af7'
    ELSE color END;

UPDATE events SET color = CASE lower(color)
    WHEN '#6366f1' THEN '#2b8af7'
    WHEN '#3e7bfa' THEN '#2b8af7'
    WHEN '#8b5cf6' THEN '#5f86a6'
    WHEN '#7a6ff0' THEN '#5f86a6'
    WHEN '#a855f7' THEN '#c9557f'
    WHEN '#ec4899' THEN '#c9557f'
    WHEN '#ef4444' THEN '#d0683f'
    WHEN '#f59e0b' THEN '#c7962f'
    WHEN '#22c55e' THEN '#30a46c'
    WHEN '#14b8a6' THEN '#2aa198'
    WHEN '#38bdf8' THEN '#2b8af7'
    ELSE color END;
