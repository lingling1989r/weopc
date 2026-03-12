import app from '../app';

type Layer = {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
  regexp?: RegExp;
  handle?: {
    stack?: Layer[];
  };
  name?: string;
};

function getMountedSkillsRouterStack(): Layer[] {
  const appRouter = (app as typeof app & {
    _router?: {
      stack?: Layer[];
    };
  })._router;

  if (!appRouter?.stack) {
    throw new Error('Express app router stack not found');
  }

  const skillsLayer = appRouter.stack.find((layer: Layer) => layer.regexp?.toString().includes('\\/skills\\/?(?=\\/|$)'));

  if (!skillsLayer?.handle?.stack) {
    throw new Error('Mounted /api/v1/skills router not found');
  }

  return skillsLayer.handle.stack;
}

function getRouteIndex(stack: Layer[], path: string, method: string): number {
  return stack.findIndex(
    (layer) => layer.route?.path === path && layer.route.methods[method.toLowerCase()]
  );
}

function main() {
  const stack = getMountedSkillsRouterStack();
  const myListIndex = getRouteIndex(stack, '/my/list', 'get');
  const myPurchasedIndex = getRouteIndex(stack, '/my/purchased', 'get');
  const byIdIndex = getRouteIndex(stack, '/:id', 'get');

  if (myListIndex === -1 || myPurchasedIndex === -1 || byIdIndex === -1) {
    throw new Error(`Expected routes not found: my/list=${myListIndex}, my/purchased=${myPurchasedIndex}, :id=${byIdIndex}`);
  }

  if (myListIndex > byIdIndex || myPurchasedIndex > byIdIndex) {
    throw new Error(`Route order invalid: my/list=${myListIndex}, my/purchased=${myPurchasedIndex}, :id=${byIdIndex}`);
  }

  console.log('Skills route order OK', {
    myListIndex,
    myPurchasedIndex,
    byIdIndex,
  });
}

main();
