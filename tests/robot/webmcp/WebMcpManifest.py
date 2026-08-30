"""Keywords for inspecting the WebMCP manifest.

Standard library only, on purpose: the suite has to run on a checkout that has
installed nothing beyond Robot Framework and RequestsLibrary.

The interesting keyword here is `Manifest Should Not Expose Keys`. It walks the
whole decoded document rather than the top level, because the thing worth
catching is a coordinate nested three levels inside a tool's input schema, not
one sitting at the root where anyone would notice it. It matches on *keys*, not
values: a description that contains the word "coordinates" while explaining that
coordinates are never returned is correct, and a test that failed on it would be
teaching the wrong lesson.

It takes an explicit allowlist of paths rather than a blanket exemption, because
the disclosure rule here is an asymmetry, not a ban. `place_block` legitimately
accepts a `position` — coordinates travel inbound, as an argument the agent
itself supplied. What must never happen is a coordinate travelling back out. So
the one permitted appearance is named by its exact path, and any *other*
appearance fails. Paths address tools by name rather than by index, so
reordering the catalog cannot silently move the exemption onto a different tool.
"""

import re

CELL_KEY = re.compile(r"-?\d+,-?\d+,-?\d+")


def _walk(node, path="$"):
    """Yield every (path, key, value) pair in a decoded JSON document.

    List entries carrying a "name" are addressed by it, so a tool's path stays
    stable when the catalog is reordered.
    """
    if isinstance(node, dict):
        for key, value in node.items():
            here = "{}.{}".format(path, key)
            yield here, key, value
            yield from _walk(value, here)
    elif isinstance(node, list):
        for index, value in enumerate(node):
            label = value.get("name") if isinstance(value, dict) else None
            here = "{}[{}]".format(path, label if label else index)
            yield from _walk(value, here)


def manifest_should_not_expose_keys(manifest, forbidden, allowed_paths=None):
    """Fail if a forbidden key name appears anywhere outside the allowlist.

    `allowed_paths` names the exact places a forbidden key may legitimately
    appear: inbound tool parameters, and nothing else.
    """
    banned = {f.lower() for f in forbidden}
    allowed = set(allowed_paths or [])
    hits = [
        "{} (key '{}')".format(path, key)
        for path, key, _ in _walk(manifest)
        if key.lower() in banned and path not in allowed
    ]
    if hits:
        raise AssertionError(
            "manifest exposes disclosure-gated keys: " + ", ".join(sorted(hits))
        )


def coordinate_key_paths(manifest):
    """Every path at which a coordinate-shaped key appears.

    Asserts the asymmetry from the other side: it is not enough that the known
    exemption passes, the exemption must also be the only one there is.
    """
    coordinate_keys = {"position", "cell", "bycell", "voxels", "x", "y", "z"}
    return sorted(
        path for path, key, _ in _walk(manifest) if key.lower() in coordinate_keys
    )


def manifest_should_not_contain_cell_keys(manifest):
    """Fail if any string value looks like an 'x,y,z' grid cell key."""
    hits = [
        "{} = {!r}".format(path, value)
        for path, _, value in _walk(manifest)
        if isinstance(value, str) and CELL_KEY.search(value)
    ]
    if hits:
        raise AssertionError("manifest contains grid cell keys: " + ", ".join(sorted(hits)))


def tool_names(manifest):
    """The list of tool names, in declaration order."""
    return [tool["name"] for tool in manifest.get("tools", [])]


def check_every_tool_is_describable(manifest):
    """Fail unless every tool carries a usable name, description and input schema.

    'Usable' means usable *by a model*: a one-word description is present but
    useless, so the length floor is deliberate rather than a null check.
    """
    problems = []
    for index, tool in enumerate(manifest.get("tools", [])):
        label = tool.get("name") or "tools[{}]".format(index)

        name = tool.get("name", "")
        if not re.fullmatch(r"[a-z][a-z0-9_]*", name or ""):
            problems.append("{}: name is missing or not snake_case".format(label))

        description = (tool.get("description") or "").strip()
        if len(description) < 20:
            problems.append("{}: description is missing or too short".format(label))

        schema = tool.get("inputSchema")
        if not isinstance(schema, dict) or schema.get("type") != "object":
            problems.append("{}: inputSchema is missing or not an object schema".format(label))
        elif not isinstance(schema.get("properties"), dict):
            problems.append("{}: inputSchema has no properties map".format(label))

    if problems:
        raise AssertionError("; ".join(problems))


def duplicate_tool_names(manifest):
    """The tool names that appear more than once. Empty list means unique."""
    seen, duplicates = set(), []
    for name in tool_names(manifest):
        if name in seen:
            duplicates.append(name)
        seen.add(name)
    return duplicates
