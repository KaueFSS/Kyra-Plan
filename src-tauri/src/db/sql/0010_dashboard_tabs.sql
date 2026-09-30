-- User-defined dashboard tabs ("guias"). Each tab stores its widget layout
-- as JSON: a list of { i, type, x, y, w, h } on a 12x12 grid. The layout is
-- purely presentational, so a JSON column is simpler than a widgets table.
CREATE TABLE dashboard_tabs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    layout TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_dashboard_tabs_position ON dashboard_tabs (position);

-- The "everything in one place" home tab, matching the default HUD.
INSERT INTO dashboard_tabs (id, name, position, layout) VALUES (
    'home',
    'Início',
    0,
    '[{"i":"calendar","type":"calendar","x":0,"y":0,"w":3,"h":7},{"i":"schedule","type":"schedule","x":3,"y":0,"w":6,"h":7},{"i":"focus","type":"focus","x":9,"y":0,"w":3,"h":3},{"i":"daily","type":"daily-tasks","x":9,"y":3,"w":3,"h":4},{"i":"events","type":"events","x":0,"y":7,"w":3,"h":5},{"i":"weekly","type":"weekly-tasks","x":3,"y":7,"w":6,"h":5},{"i":"time","type":"time","x":9,"y":7,"w":3,"h":5}]'
);
