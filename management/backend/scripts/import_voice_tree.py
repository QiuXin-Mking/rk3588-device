"""Explicitly import business data from the standalone Voice Tree SQLite file."""

import argparse
import asyncio
import json
import logging
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core import context
from app.core.db import engine
from app.model.voice_tree import VoiceTreeForm, VoiceTreeSubmission


def arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("sqlite_file", type=Path)
    parser.add_argument("workspace_id", type=uuid.UUID)
    return parser.parse_args()


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)


async def import_data(sqlite_file: Path, workspace_id: uuid.UUID) -> None:
    connection = sqlite3.connect(sqlite_file)
    connection.row_factory = sqlite3.Row
    source_forms = connection.execute("SELECT * FROM forms ORDER BY id").fetchall()
    source_submissions = connection.execute(
        "SELECT * FROM submissions ORDER BY id"
    ).fetchall()
    connection.close()

    context.set_workspace_id(workspace_id)
    async with AsyncSession(engine, expire_on_commit=False) as session:
        form_ids: dict[int, uuid.UUID] = {}
        imported_forms = 0
        for row in source_forms:
            existing = await session.exec(
                select(VoiceTreeForm)
                .where(VoiceTreeForm.slug == row["slug"])
                .execution_options(exempt_workspace_filter=True)
            )
            form = existing.first()
            if not form:
                definition = json.loads(row["definition_json"])
                form = VoiceTreeForm(
                    slug=row["slug"],
                    title=row["title"],
                    subtitle=row["subtitle"],
                    intro_text=row["intro_text"],
                    entry_label=row["entry_label"],
                    closing_text=row["closing_text"],
                    status=row["status"],
                    theme=row["theme"],
                    questions=definition.get("questions", []),
                    version=row["version"],
                    published_at=parse_datetime(row["published_at"]),
                    created_at=parse_datetime(row["created_at"]),
                    updated_at=parse_datetime(row["updated_at"]),
                )
                session.add(form)
                await session.commit()
                await session.refresh(form)
                imported_forms += 1
            form_ids[int(row["id"])] = form.id

        imported_submissions = 0
        for row in source_submissions:
            trace_code = str(row["trace_code"])
            existing = await session.exec(
                select(VoiceTreeSubmission)
                .where(VoiceTreeSubmission.trace_code == trace_code)
                .execution_options(exempt_workspace_filter=True)
            )
            if existing.first():
                continue
            form_id = form_ids.get(int(row["form_id"]))
            if not form_id:
                continue
            submission = VoiceTreeSubmission(
                form_id=form_id,
                trace_code=trace_code,
                status=row["status"],
                answers=json.loads(row["answers_json"]),
                visible_path=json.loads(row["visible_path_json"]),
                form_snapshot=json.loads(row["form_snapshot_json"]),
                submitted_at=parse_datetime(row["submitted_at"])
                or datetime.now(timezone.utc),
                processed_by_username=row["processed_by_username"],
                note=row["note"],
                created_at=parse_datetime(row["submitted_at"]),
                updated_at=parse_datetime(row["updated_at"]),
            )
            session.add(submission)
            await session.commit()
            imported_submissions += 1
    context.reset_workspace_id()
    logging.getLogger(__name__).warning(
        f"Imported {imported_forms} forms and {imported_submissions} submissions "
        f"into workspace {workspace_id}."
    )


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    args = arguments()
    asyncio.run(import_data(args.sqlite_file.resolve(), args.workspace_id))
