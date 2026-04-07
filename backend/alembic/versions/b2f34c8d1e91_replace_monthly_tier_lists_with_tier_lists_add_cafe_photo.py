"""replace monthly_tier_lists with tier_lists, add cafe photo_url

Revision ID: b2f34c8d1e91
Revises: a1277a28f847
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


revision: str = 'b2f34c8d1e91'
down_revision: Union[str, Sequence[str], None] = 'a1277a28f847'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old tier list tables (no production data to preserve)
    op.execute('DROP TABLE IF EXISTS tier_list_entries')
    op.execute('DROP TABLE IF EXISTS monthly_tier_lists')

    # Create new tier_lists table (named, not month-locked)
    op.create_table(
        'tier_lists',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('visibility', sa.String(10), nullable=False, server_default='public'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    # Create new tier_list_entries table
    op.create_table(
        'tier_list_entries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tier_list_id', UUID(as_uuid=True), sa.ForeignKey('tier_lists.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('cafe_id', UUID(as_uuid=True), sa.ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tier', sa.String(1), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
    )

    # Add photo_url to cafes
    op.add_column('cafes', sa.Column('photo_url', sa.String(1000), nullable=True))


def downgrade() -> None:
    op.drop_column('cafes', 'photo_url')
    op.drop_table('tier_list_entries')
    op.drop_table('tier_lists')

    op.create_table(
        'monthly_tier_lists',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('year', sa.SmallInteger(), nullable=False),
        sa.Column('month', sa.SmallInteger(), nullable=False),
        sa.Column('visibility', sa.String(10), nullable=False, server_default='public'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )
    op.create_table(
        'tier_list_entries',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tier_list_id', UUID(as_uuid=True), sa.ForeignKey('monthly_tier_lists.id', ondelete='CASCADE'), nullable=False),
        sa.Column('cafe_id', UUID(as_uuid=True), sa.ForeignKey('cafes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('tier', sa.String(1), nullable=False),
        sa.Column('position', sa.Integer(), nullable=False),
    )
