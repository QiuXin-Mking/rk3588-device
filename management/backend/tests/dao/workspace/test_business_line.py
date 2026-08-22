import pytest
from sqlmodel.ext.asyncio.session import AsyncSession

from app import dao
from app.core import context
from app.core.exceptions import BusinessException
from app.model.workspace.business_line import BusinessLineCreate, BusinessLineListFilter


async def test_create_business_line(db: AsyncSession, generic_workspace) -> None:
    context.set_workspace_id(generic_workspace.id)

    bl_in = BusinessLineCreate(
        name="Test Dept",
        external_id="EXT01",
    )
    bl = await dao.create_business_line(session=db, business_line_create=bl_in)
    assert bl.name == "Test Dept"
    assert bl.id is not None
    assert str(bl.workspace_id) == str(generic_workspace.id)


async def test_business_line_tree(db: AsyncSession, generic_workspace) -> None:
    context.set_workspace_id(generic_workspace.id)

    # 1. Create Parent
    parent_in = BusinessLineCreate(
        name="Parent",
        external_id="EXT_P",
    )
    await dao.create_business_line(session=db, business_line_create=parent_in)

    # 2. Create Child
    child_in = BusinessLineCreate(
        name="Child",
        external_id="EXT_C",
        parent_id="EXT_P",  # Points to external_id of parent
    )
    await dao.create_business_line(session=db, business_line_create=child_in)

    # 3. Test Tree
    tree = await dao.get_business_lines_tree(
        session=db, filters=BusinessLineListFilter()
    )
    # The parent should be a root node in the tree and should have 1 child
    parent_node = next((n for n in tree if n.external_id == "EXT_P"), None)
    assert parent_node is not None
    assert len(parent_node.children) == 1
    assert parent_node.children[0].external_id == "EXT_C"

    # Child should not be a root node
    child_node = next((n for n in tree if n.external_id == "EXT_C"), None)
    assert child_node is None


async def test_delete_business_line_with_children(
    db: AsyncSession, generic_workspace
) -> None:
    context.set_workspace_id(generic_workspace.id)

    # 1. Create Parent & Child
    parent = await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(name="P", external_id="P_E"),
    )
    child = await dao.create_business_line(
        session=db,
        business_line_create=BusinessLineCreate(
            name="C",
            external_id="C_E",
            parent_id="P_E",
        ),
    )

    # 2. Try to delete parent, should raise BusinessException
    with pytest.raises(BusinessException) as exc_info:
        await dao.delete_business_line(session=db, db_business_line=parent)
    assert "请先删除或迁移子业务线" in str(exc_info.value.msg)

    # 3. Delete child then parent
    await dao.delete_business_line(session=db, db_business_line=child)
    await dao.delete_business_line(session=db, db_business_line=parent)

    # Verify both deleted
    p_check = await dao.get_business_line_by_id(session=db, business_line_id=parent.id)
    assert p_check is None


async def test_get_business_line_by_id(db: AsyncSession, generic_business_line) -> None:
    fetched = await dao.get_business_line_by_id(
        session=db, business_line_id=generic_business_line.id
    )
    assert fetched is not None
    assert fetched.id == generic_business_line.id
    assert fetched.name == generic_business_line.name


async def test_get_business_lines(db: AsyncSession, generic_workspace) -> None:
    context.set_workspace_id(generic_workspace.id)

    bl_in1 = BusinessLineCreate(name="Dept A")
    bl_in2 = BusinessLineCreate(name="Dept B")
    await dao.create_business_line(session=db, business_line_create=bl_in1)
    await dao.create_business_line(session=db, business_line_create=bl_in2)

    count, lists = await dao.get_business_lines(
        session=db, filters=BusinessLineListFilter()
    )
    assert count >= 2
    assert len(lists) >= 2


async def test_update_business_line(db: AsyncSession, generic_business_line) -> None:
    from app.model.workspace.business_line import BusinessLineUpdate

    update_in = BusinessLineUpdate(name="Updated")
    updated_bl = await dao.update_business_line(
        session=db, db_business_line=generic_business_line, business_line_in=update_in
    )
    assert updated_bl.name == "Updated"
