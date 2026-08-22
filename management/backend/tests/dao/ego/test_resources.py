from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core import context
from app.model.ego.resources import (
    CollectionSop,
    CollectionSopCreate,
    CollectionTask,
    CollectionTaskCreate,
    ProductKit,
    ProductKitCreate,
    ResourceListFilter,
)


async def test_resource_crud_and_soft_delete(
    db: AsyncSession, generic_workspace
) -> None:
    context.set_workspace_id(generic_workspace.id)
    item = await dao.create_resource(
        session=db,
        model=ProductKit,
        payload=ProductKitCreate(code="KIT-DAO", name="DAO 套件"),
    )
    assert item.workspace_id == generic_workspace.id

    count, items = await dao.get_resources(
        session=db,
        model=ProductKit,
        filters=ResourceListFilter(q="DAO"),
        search_fields=("code", "name"),
    )
    assert count == 1
    assert items[0].id == item.id

    await dao.delete_resource(session=db, db_obj=item)
    assert (
        await dao.get_resource_by_id(
            session=db, model=ProductKit, resource_id=item.id
        )
        is None
    )
    context.reset_workspace_id()


async def test_collection_tasks_are_workspace_isolated(
    db: AsyncSession, generic_workspace
) -> None:
    from app.model.system.workspace import WorkspaceCreate

    other_workspace = await dao.create_workspace(
        session=db, workspace_create=WorkspaceCreate(name="Other workspace")
    )
    context.set_workspace_id(generic_workspace.id)
    own_sop = await dao.create_resource(
        session=db,
        model=CollectionSop,
        payload=CollectionSopCreate(name="Own SOP", content="Follow the SOP"),
    )
    own = await dao.create_resource(
        session=db,
        model=CollectionTask,
        payload=CollectionTaskCreate(
            task_no="TASK-OWN", project_name="Project", name="Own task", sop_id=own_sop.id
        ),
    )
    context.set_workspace_id(other_workspace.id)
    other_sop = await dao.create_resource(
        session=db,
        model=CollectionSop,
        payload=CollectionSopCreate(name="Other SOP", content="Follow the other SOP"),
    )
    await dao.create_resource(
        session=db,
        model=CollectionTask,
        payload=CollectionTaskCreate(
            task_no="TASK-OTHER", project_name="Project", name="Other task", sop_id=other_sop.id
        ),
    )
    context.set_workspace_id(generic_workspace.id)
    count, items = await dao.get_resources(
        session=db,
        model=CollectionTask,
        filters=ResourceListFilter(),
        search_fields=("task_no", "name"),
    )
    assert count == 1
    assert [item.id for item in items] == [own.id]
    context.reset_workspace_id()
