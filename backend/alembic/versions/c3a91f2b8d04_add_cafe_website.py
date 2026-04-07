"""add cafe website

Revision ID: c3a91f2b8d04
Revises: b2f34c8d1e91
Create Date: 2026-04-07 01:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3a91f2b8d04'
down_revision: Union[str, Sequence[str], None] = 'b2f34c8d1e91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('cafes', sa.Column('website', sa.String(500), nullable=True))

    # Seed websites for known Austin cafes
    op.execute("""
        UPDATE cafes SET website = 'https://www.spokesmancoffee.com' WHERE name ILIKE '%Spokesman%';
        UPDATE cafes SET website = 'https://www.joscoffee.com' WHERE name ILIKE '%Jo%s%Coffee%';
        UPDATE cafes SET website = 'https://epochcoffee.com' WHERE name ILIKE '%Epoch%';
        UPDATE cafes SET website = 'https://radiocoffeeandbeer.com' WHERE name ILIKE '%Radio Coffee%';
        UPDATE cafes SET website = 'https://summermooncoffee.com' WHERE name ILIKE '%Summer Moon%';
        UPDATE cafes SET website = 'https://patikacoffee.com' WHERE name ILIKE '%Patika%';
    """)


def downgrade() -> None:
    op.drop_column('cafes', 'website')
