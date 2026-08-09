/**
 * E2E coverage for the knowledge graph workspace.
 *
 * The unit and integration suites prove the pipeline is correct in isolation.
 * These tests prove the derived-from-the-store wiring actually works in the
 * running app: that opening a real build produces a real graph, and that the
 * traversal queries answer with the right assets rather than an empty panel.
 */

import { test, expect, type Locator, type Page } from '@playwright/test';

async function openGraph(page: Page) {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Open knowledge graph workspace' }).click();
  const workspace = page.getByRole('complementary', { name: 'Knowledge graph workspace' });
  await expect(workspace).toBeVisible();
  return workspace;
}

/** Picks the first option whose visible text contains `needle`. */
async function selectByText(scope: Locator, label: string, needle: string) {
  const select = scope.getByLabel(label);
  const value = await select
    .locator('option', { hasText: needle })
    .first()
    .getAttribute('value');
  expect(value, `no option matching "${needle}" in ${label}`).not.toBeNull();
  await select.selectOption(value!);
}

test.describe('Knowledge graph workspace', () => {
  // The builder route is heavy (R3F canvas, dynamic import) and the dev server
  // compiles it on first hit, which alone can exceed the default timeout.
  test.slow();

  test('opens from the builder and renders the ontology', async ({ page }) => {
    await page.goto('/build/free');
    const workspace = await openGraph(page);

    await expect(page.getByRole('navigation', { name: 'Graph tools' }).getByRole('button')).toHaveCount(4);

    // The ontology tab is the default and is rendered from the exported schema,
    // so these counts moving means the schema moved.
    await expect(workspace.getByRole('heading', { name: /Entity types \(12\)/ })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: /Relation types \(24\)/ })).toBeVisible();
    await expect(workspace.getByRole('heading', { name: /Competency questions \(12\)/ })).toBeVisible();
    // The relation table row, specifically — "POWERS" also appears inside a
    // competency question's traversal string.
    await expect(workspace.getByRole('cell', { name: 'POWERS', exact: true })).toBeVisible();
    await expect(workspace.getByRole('cell', { name: 'Asset → Asset' }).first()).toBeVisible();
  });

  test('stays inside the viewport at desktop width', async ({ page }) => {
    await page.goto('/build/free');
    const workspace = await openGraph(page);
    const box = await workspace.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(672);
    expect(box!.x).toBeGreaterThanOrEqual(0);
  });

  test('builds a graph from a loaded demo and reports a clean quality gate', async ({ page }) => {
    await page.goto('/build/greenfield?demo=greenfield-tier3');
    await expect(page.getByText('blocks: 40')).toBeVisible({ timeout: 10_000 });

    const workspace = await openGraph(page);
    await expect(workspace.getByTestId('graph-summary')).toContainText(/\d+ nodes/);

    await workspace.getByRole('button', { name: 'Quality' }).click();
    const precision = workspace.getByTestId('graph-quality-precision');
    await expect(precision).toContainText('Precision 100.0%');
    await expect(precision).toContainText('passed');

    // The legacy space aliases the default hierarchy ships must be merged away.
    await expect(workspace.getByLabel('Merged nodes')).toContainText('Space:hall-a');
  });

  test('answers an impact-of-failure query with the dependent assets', async ({ page }) => {
    await page.goto('/build/greenfield?demo=greenfield-tier3');
    await expect(page.getByText('blocks: 40')).toBeVisible({ timeout: 10_000 });

    const workspace = await openGraph(page);
    await workspace.getByRole('button', { name: 'Query' }).click();

    // Failing a UPS must impair downstream assets, not report an empty result.
    await selectByText(workspace, 'Failure source', 'UPS');
    const impact = workspace.getByTestId('graph-impact');
    await expect(impact).toContainText(/impairs \d+ nodes?/);
    await expect(impact).toContainText('powers');
  });

  test('explains the score by naming rules and the rule pack', async ({ page }) => {
    await page.goto('/build/greenfield?demo=greenfield-tier3');
    await expect(page.getByText('blocks: 40')).toBeVisible({ timeout: 10_000 });

    const workspace = await openGraph(page);
    await workspace.getByRole('button', { name: 'Query' }).click();
    const explanation = workspace.getByTestId('graph-score-explanation');
    await expect(explanation).toContainText(/Rated \d+\/100/);
    await expect(explanation).toContainText('rule pack');
  });

  test('explores a node and serializes its neighbourhood as triples', async ({ page }) => {
    await page.goto('/build/greenfield?demo=greenfield-tier3');
    await expect(page.getByText('blocks: 40')).toBeVisible({ timeout: 10_000 });

    const workspace = await openGraph(page);
    await workspace.getByRole('button', { name: 'Explore' }).click();
    await workspace.getByLabel('Search graph nodes').fill('Server Rack');

    await expect(workspace.getByTestId('graph-node-description')).toContainText('is a Asset');
    const triples = workspace.getByTestId('graph-triples');
    await expect(triples).toContainText('-[');
    await expect(triples).toContainText('INSTANCE_OF');

    // Two hops must widen the neighbourhood, not repeat the one-hop result.
    const oneHop = await triples.innerText();
    await workspace.getByLabel('Neighbourhood radius').selectOption('2');
    await expect(triples).not.toHaveText(oneHop);
  });

  test('reports an empty build honestly rather than rendering nothing', async ({ page }) => {
    await page.goto('/build/free');
    const workspace = await openGraph(page);
    await workspace.getByRole('button', { name: 'Query' }).click();
    await expect(workspace.getByTestId('graph-impact')).toContainText(
      'Place some blocks to run this query.',
    );
  });
});
