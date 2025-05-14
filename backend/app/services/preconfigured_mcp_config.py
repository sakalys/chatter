from uuid import UUID

import httpx
from mcp import ClientSession
from mcp.client.streamable_http import streamablehttp_client
from result import Ok, Result, Err
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.mcp_tool import MCPToolShape
from app.models.preconfigured_mcp_config import PreconfiguredMCPConfig
from app.models.user import User


async def get_preconfigured_configs_by_user(
    db: AsyncSession,
    user: User,
) -> list[PreconfiguredMCPConfig]:
    """
    Get all preconfigured MCP configurations for a user.

    Args:
        db: Database session
        user: User object

    Returns:
        List of preconfigured MCP configuration objects
    """
    result = await db.execute(
        select(PreconfiguredMCPConfig)
        .where(PreconfiguredMCPConfig.user_id == user.id)
    )

    return list(result.scalars().unique().all())  # Cast to list


async def get_preconfigured_config_by_code_and_user_id(
    db: AsyncSession,
    code: str,
    user_id: UUID,
) -> PreconfiguredMCPConfig | None:
    """
    Get an MCP configuration by ID for a specific user.

    Args:
        db: Database session
        mcp_config_id: MCP configuration ID
        user_id: User ID

    Returns:
        MCP configuration object or None if not found
    """
    result = await db.execute(
        select(PreconfiguredMCPConfig)
        .where(
            PreconfiguredMCPConfig.code == code,
            PreconfiguredMCPConfig.user_id == user_id,
        )
    )
    return result.scalars().first()


async def create_preconfigured_config(
    db: AsyncSession,
    user: User,
    enabled: bool,
    code: str,
) -> Result[PreconfiguredMCPConfig, str]:

    config = PreconfiguredMCPConfig(
        user=user,
        enabled=enabled,
        code=code,
    )

    db.add(config)
    await db.commit()
    await db.refresh(config)

    return Ok(config)


def get_preconfigured_url(code: str) -> str:
    match code:
        case "sequentialthinking":
            return "https://remote.mcpservers.org/sequentialthinking/mcp"
        case "fetch":
            return "https://remote.mcpservers.org/fetch/mcp"
        case _:
            raise


def shape_name(config: PreconfiguredMCPConfig, name: str, should_prefix: bool) -> str:
    return (config.code + "__" + name) if should_prefix else name

def get_preconfigured_tools(config: PreconfiguredMCPConfig, should_prefix = True)-> list[MCPToolShape]:
    if config.code == 'fetch':
        return [
            MCPToolShape(
                name=shape_name(config, 'fetch', should_prefix),
                description="Fetch a URL and extract its contents as markdown",
                inputSchema={
                    "$schema": "http://json-schema.org/draft-07/schema#",
                    "additionalProperties": False,
                    "properties": {
                        "max_length": {"default": 5000, "type": "number"},
                        "raw": {"default": False, "type": "boolean"},
                        "start_index": {"default": 0, "type": "number"},
                        "url": {"type": "string"},
                    },
                    "required": ["url"],
                    "type": "object",
                },
            )
        ]
    elif config.code == "sequentialthinking":
        return [
            MCPToolShape(
                name=shape_name(config, 'sequentialthinking', should_prefix),
                description="""A detailed tool for dynamic and reflective problem-solving through thoughts.
        This tool helps analyze problems through a flexible thinking process that can adapt and evolve.
        Each thought can build on, question, or revise previous insights as understanding deepens.

        When to use this tool:
        - Breaking down complex problems into steps
        - Planning and design with room for revision
        - Analysis that might need course correction
        - Problems where the full scope might not be clear initially
        - Problems that require a multi-step solution
        - Tasks that need to maintain context over multiple steps
        - Situations where irrelevant information needs to be filtered out

        Key features:
        - You can adjust total_thoughts up or down as you progress
        - You can question or revise previous thoughts
        - You can add more thoughts even after reaching what seemed like the end
        - You can express uncertainty and explore alternative approaches
        - Not every thought needs to build linearly - you can branch or backtrack
        - Generates a solution hypothesis
        - Verifies the hypothesis based on the Chain of Thought steps
        - Repeats the process until satisfied
        - Provides a correct answer

        Parameters explained:
        - thought: Your current thinking step, which can include:
        * Regular analytical steps
        * Revisions of previous thoughts
        * Questions about previous decisions
        * Realizations about needing more analysis
        * Changes in approach
        * Hypothesis generation
        * Hypothesis verification
        - next_thought_needed: True if you need more thinking, even if at what seemed like the end
        - thought_number: Current number in sequence (can go beyond initial total if needed)
        - total_thoughts: Current estimate of thoughts needed (can be adjusted up/down)
        - is_revision: A boolean indicating if this thought revises previous thinking
        - revises_thought: If is_revision is true, which thought number is being reconsidered
        - branch_from_thought: If branching, which thought number is the branching point
        - branch_id: Identifier for the current branch (if any)
        - needs_more_thoughts: If reaching end but realizing more thoughts needed

        You should:
        1. Start with an initial estimate of needed thoughts, but be ready to adjust
        2. Feel free to question or revise previous thoughts
        3. Don't hesitate to add more thoughts if needed, even at the "end"
        4. Express uncertainty when present
        5. Mark thoughts that revise previous thinking or branch into new paths
        6. Ignore information that is irrelevant to the current step
        7. Generate a solution hypothesis when appropriate
        8. Verify the hypothesis based on the Chain of Thought steps
        9. Repeat the process until satisfied with the solution
        10. Provide a single, ideally correct answer as the final output
        11. Only set next_thought_needed to false when truly done and a satisfactory answer is reached""",
                inputSchema={
                    "properties": {
                        "branchFromThought": {
                            "description": "Branching point " "thought number",
                            "minimum": 1,
                            "type": "integer",
                        },
                        "branchId": {"description": "Branch identifier", "type": "string"},
                        "isRevision": {
                            "description": "Whether this revises " "previous thinking",
                            "type": "boolean",
                        },
                        "needsMoreThoughts": {
                            "description": "If more thoughts are " "needed",
                            "type": "boolean",
                        },
                        "nextThoughtNeeded": {
                            "description": "Whether another " "thought step is " "needed",
                            "type": "boolean",
                        },
                        "revisesThought": {
                            "description": "Which thought is being " "reconsidered",
                            "minimum": 1,
                            "type": "integer",
                        },
                        "thought": {
                            "description": "Your current thinking step",
                            "type": "string",
                        },
                        "thoughtNumber": {
                            "description": "Current thought number",
                            "minimum": 1,
                            "type": "integer",
                        },
                        "totalThoughts": {
                            "description": "Estimated total thoughts " "needed",
                            "minimum": 1,
                            "type": "integer",
                        },
                    },
                    "required": [
                        "thought",
                        "nextThoughtNeeded",
                        "thoughtNumber",
                        "totalThoughts",
                    ],
                    "type": "object",
                },
            )
        ]
    else:
        return []

