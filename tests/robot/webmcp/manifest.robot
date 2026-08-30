*** Settings ***
Documentation     The WebMCP tool manifest, checked over HTTP against a running server.
...
...               The tools themselves only exist inside a WebMCP-capable browser, which
...               makes them hard to assert against directly. /api/webmcp/manifest serves
...               the same catalog, derived from the same definitions, so this suite can
...               check the two things that actually break in the field: an agent-facing
...               surface that a model cannot understand, and a payload that says more
...               than it should.

Library           RequestsLibrary
Library           Collections
Library           WebMcpManifest.py
Suite Setup       Create Session    app    ${BASE_URL}    verify=${TRUE}

*** Variables ***
${BASE_URL}       http://127.0.0.1:3111
@{EXPECTED_TOOLS}
...               list_block_types
...               place_block
...               remove_block
...               get_build_snapshot
...               score_build
...               explain_failing_rules
# Keys that would mean the disclosure gate had been bypassed. byCell's keys are
# coordinates, so the cell-key format is checked separately from the names.
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
# The one place a coordinate may legitimately appear: place_block's inbound
# argument, which the agent supplied itself. Addressed by tool name, so
# reordering the catalog cannot move the exemption somewhere else.
@{ALLOWED_KEY_PATHS}
...               $.tools[place_block].inputSchema.properties.position
...               $.tools[place_block].inputSchema.properties.position.properties.x
...               $.tools[place_block].inputSchema.properties.position.properties.y
...               $.tools[place_block].inputSchema.properties.position.properties.z

*** Test Cases ***
Manifest Route Answers With JSON
    [Documentation]    The route exists, returns 200, and is actually JSON.
    [Tags]    smoke
    ${response}=    GET On Session    app    /api/webmcp/manifest    expected_status=200
    Should Contain    ${response.headers}[content-type]    application/json
    ${manifest}=    Set Variable    ${response.json()}
    Should Be Equal    ${manifest}[protocol]    webmcp
    Should Not Be Empty    ${manifest}[version]

Manifest Declares Every Expected Tool
    [Documentation]    Tool names are an API. A rename breaks every agent that learned this page.
    [Tags]    contract
    ${manifest}=    Get Manifest
    ${names}=    Tool Names    ${manifest}
    Lists Should Be Equal    ${names}    ${EXPECTED_TOOLS}    ignore_order=${TRUE}

Tool Names Are Unique
    [Tags]    contract
    ${manifest}=    Get Manifest
    ${duplicates}=    Duplicate Tool Names    ${manifest}
    Should Be Empty    ${duplicates}

Every Tool Is Describable By A Model
    [Documentation]    Non-empty snake_case name, a real description, an object input schema.
    [Tags]    contract
    ${manifest}=    Get Manifest
    Check Every Tool Is Describable    ${manifest}

Every Tool Input Property Is Documented
    [Documentation]    An undescribed parameter is one the agent will guess at.
    [Tags]    contract
    ${manifest}=    Get Manifest
    FOR    ${tool}    IN    @{manifest}[tools]
        ${properties}=    Set Variable    ${tool}[inputSchema][properties]
        FOR    ${name}    ${schema}    IN    &{properties}
            Should Not Be Empty    ${schema.get('description', '')}
            ...    msg=${tool}[name].${name} has no description
        END
    END

Manifest Exposes No Disclosure Gated Field Names
    [Documentation]    The central claim: an agent-facing surface never names the layout,
    ...                the knowledge-graph digest, the blinding factor or session identity.
    ...                The single exemption is place_block's inbound position — coordinates
    ...                travel in, never out — and it is named by its exact path so that no
    ...                other appearance can hide behind it.
    [Tags]    disclosure
    ${manifest}=    Get Manifest
    Manifest Should Not Expose Keys    ${manifest}    ${FORBIDDEN_KEYS}    ${ALLOWED_KEY_PATHS}

Coordinates Appear Only As An Inbound Parameter
    [Documentation]    The asymmetry from the other side: the allowlist above must be the
    ...                whole story, not merely a passing case.
    [Tags]    disclosure
    ${manifest}=    Get Manifest
    ${paths}=    Coordinate Key Paths    ${manifest}
    Lists Should Be Equal    ${paths}    ${ALLOWED_KEY_PATHS}    ignore_order=${TRUE}

Manifest Contains No Grid Cell Keys
    [Documentation]    byCell keys are coordinates under another name.
    [Tags]    disclosure
    ${manifest}=    Get Manifest
    Manifest Should Not Contain Cell Keys    ${manifest}

Manifest States The Disclosure Contract
    [Documentation]    Stated once, copied from the gate, so a judge can read it without the app.
    [Tags]    disclosure
    ${manifest}=    Get Manifest
    ${disclosure}=    Set Variable    ${manifest}[disclosure]
    Should Contain    ${disclosure}[defaultFields]    axisScores
    Should Contain    ${disclosure}[optionalFields]    overallScore
    Should Contain    ${disclosure}[optionalFields]    pue
    ${never}=    Evaluate    ' '.join($disclosure['neverDisclosed']).lower()
    Should Contain    ${never}    coordinates
    Should Contain    ${never}    blinding

*** Keywords ***
Get Manifest
    ${response}=    GET On Session    app    /api/webmcp/manifest    expected_status=200
    RETURN    ${response.json()}
