# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
"""drop is_featured column from tables

Revision ID: b4a2d7f8c9e1
Revises: a1b2c3d4e5f6
Create Date: 2026-05-17 21:19:00.000000

"""

import sqlalchemy as sa  # noqa: E402
from alembic import op  # noqa: E402

# revision identifiers, used by Alembic.
revision = "b4a2d7f8c9e1"
down_revision = "a1b2c3d4e5f6"


def upgrade():
    op.drop_column("tables", "is_featured")


def downgrade():
    op.add_column(
        "tables",
        sa.Column("is_featured", sa.Boolean(), nullable=True, default=False),
    )
