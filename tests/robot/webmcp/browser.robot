*** Settings ***
Documentation     The WebMCP tools, exercised where they actually live: registered by the
...               builder page inside a real browser, executed against the live Zustand
...               store. The manifest suite beside this one checks the catalog a server
...               *describes*; this one checks the catalog a page *delivers* — that the
...               registrations happen, that executing a tool moves the same state the
...               canvas renders, and that what comes back is as silent about the layout
...               as the manifest promises.
...
...               No shipping browser exposes `modelContext`, so the suite arms one
...               before navigation: a JS-extension keyword (`WebMcpStub.js`) installs an
...               init script whose stub records `registerTool` calls and honours the
...               abort signal, so strict-mode remounts in dev do not double-count.
...
...               Assumes a server is already running at ${BASE_URL}, exactly like
...               manifest.robot — start it with `npm run dev -- --port 3111` (see the
...               README). The first request compiles /build/free from scratch in dev, so
...               the suite setup waits generously.

Library           Browser    jsextension=${CURDIR}/WebMcpStub.js    timeout=15s
Library           WebMcpBrowser.py
Suite Setup       Open The Builder With A Stubbed Agent Surface
Suite Teardown    Close Browser    ALL

*** Variables ***
${BASE_URL}       http://127.0.0.1:3111
${BADGE}          [data-testid="webmcp-badge"]
@{EXPECTED_TOOLS}
...               list_block_types
...               place_block
...               remove_block
...               get_build_snapshot
...               score_build
...               explain_failing_rules
# The same gate the manifest suite pins, because the claim is the same: these
# names never travel out to an agent. Here they are checked in tool *results*,
# where there is no inbound-parameter exemption — results only travel out.
@{FORBIDDEN_KEYS}
...               voxels
...               byCell
...               position
...               cell
...               camera
...               digest
...               kgDigest
...               blinding
...               blindingFactor
...               walletAddress
...               sessionId
...               shareToken

*** Test Cases ***
Badge Reports Six Tools Exposed
    [Documentation]    The chip renders only when registration actually happened, so its
    ...                text is the page's own claim about what the agent was handed.
    [Tags]    smoke
    ${text}=    Get Text    ${BADGE}
    Should Be Equal As Strings    ${text.strip()}    6 WebMCP tools exposed

Exactly The Expected Tools Are Registered
    [Documentation]    The registrations the stub captured, pinned to the same list the
    ...                manifest suite pins: names are an API. Each must carry a
    ...                description and an object inputSchema, or a model cannot call it.
    ...                Annotations (readOnlyHint and friends) are deliberately not
    ...                asserted absent — they are expected to arrive.
    [Tags]    contract
    ${tools}=    Evaluate JavaScript    ${None}
    ...    () => document.modelContext._tools.map((tool) => ({
    ...        name: tool.name,
    ...        description: tool.description || '',
    ...        inputSchema: tool.inputSchema,
    ...    }))
    Check Registered Tools    ${tools}    ${EXPECTED_TOOLS}

Place Block Drives The Live Build Without Echoing Coordinates
    [Documentation]    Executing place_block goes through the same store action the mouse
    ...                uses, returns an instanceId handle — and does not echo the cell it
    ...                chose, even though it knows it. Coordinates travel in, never out.
    [Tags]    contract    disclosure
    ${before}=    Execute Tool    get_build_snapshot
    ${snapshot}=    Structured Content    ${before}
    Set Suite Variable    ${BLOCKS_BEFORE_PLACEMENT}    ${snapshot}[blockCount]
    ${result}=    Execute Tool    place_block    {"type": "server_rack"}
    ${payload}=    Execution Payload    ${result}
    Should Not Be Empty    ${payload}[instanceId]
    Result Should Not Expose Coordinates    ${result}

Get Build Snapshot Reflects The Placement
    [Documentation]    The proof the tool drove the live app rather than a copy of it:
    ...                the snapshot taken through the agent surface counts one more block
    ...                than it did before place_block ran.
    [Tags]    contract
    Variable Should Exist    \${BLOCKS_BEFORE_PLACEMENT}
    ...    msg=Runs against the placement made by the previous test — do not run alone.
    ${result}=    Execute Tool    get_build_snapshot
    ${snapshot}=    Structured Content    ${result}
    Should Be Equal As Integers    ${snapshot}[blockCount]    ${BLOCKS_BEFORE_PLACEMENT + 1}

Score Build Discloses No Gated Fields
    [Documentation]    The manifest's central claim, re-checked on a live payload: no
    ...                disclosure-gated key name anywhere in the result, at any depth —
    ...                including inside the serialized text copy of the payload — and no
    ...                'x,y,z'-shaped grid cell keys.
    [Tags]    disclosure
    ${result}=    Execute Tool    score_build
    Structured Content    ${result}
    Result Should Not Expose Keys    ${result}    ${FORBIDDEN_KEYS}
    Result Should Not Contain Cell Keys    ${result}

*** Keywords ***
Open The Builder With A Stubbed Agent Surface
    New Browser    chromium    headless=${TRUE}
    New Context
    Install Web Mcp Stub
    # Dev compiles /build/free on first request; allow for the slow first load,
    # then drop back so a genuinely broken page fails in seconds, not minutes.
    ${previous}=    Set Browser Timeout    3 minutes
    New Page    ${BASE_URL}/build/free
    Wait For Elements State    ${BADGE}    visible
    Set Browser Timeout    ${previous}

Execute Tool
    [Documentation]    Run one registered tool in the page and hand back its decoded
    ...                result. The input travels as JSON text so the test data reads the
    ...                way an agent's call would.
    [Arguments]    ${name}    ${input_json}={}
    ${arg}=    Evaluate    {'name': $name, 'input': json.loads($input_json)}    modules=json
    ${text}=    Evaluate JavaScript    ${None}
    ...    async (arg) => {
    ...        const tool = document.modelContext._tools.find((candidate) => candidate.name === arg.name);
    ...        if (!tool) throw new Error('tool is not registered: ' + arg.name);
    ...        const result = await tool.execute(arg.input);
    ...        return JSON.stringify(result);
    ...    }
    ...    arg=${arg}
    ${result}=    Parse Tool Result    ${text}
    RETURN    ${result}
