/**
 * Codemod for injecting Socket.IO emits into all controllers under /controllers
 */
export default function transformer(file, api) {
  const j = api.jscodeshift
  const root = j(file.source)
  const CRUD_METHODS = [
    "save",
    "create",
    "findByIdAndUpdate",
    "findOneAndUpdate",
    "findByIdAndDelete",
    "findOneAndDelete",
    "deleteOne",
    "deleteMany",
    "updateOne",
    "updateMany"
  ]

  // for each exported async function
  root
    .find(j.ExportNamedDeclaration)
    .forEach(path => {
      const fn = path.node.declaration
      if (fn && (fn.type === "FunctionDeclaration" || fn.type === "VariableDeclaration")) {
        // ensure io is declared once
        j(path)
          .find(j.BlockStatement)
          .at(0)
          .forEach(bs => {
            // add `const io = req.app.get('io');` if not present
            const hasIo = j(bs).find(j.VariableDeclarator, {
              id: { name: "io" },
            }).size()
            if (!hasIo) {
              bs.node.body.unshift(
                j.variableDeclaration("const", [
                  j.variableDeclarator(
                    j.identifier("io"),
                    j.callExpression(
                      j.memberExpression(
                        j.memberExpression(
                          j.identifier("req"),
                          j.identifier("app")
                        ),
                        j.identifier("get")
                      ),
                      [j.literal("io")]
                    )
                  )
                ])
              )
            }
          })

        // for each CRUD call in fn body
        j(path)
          .find(j.CallExpression)
          .forEach(call => {
            const callee = call.node.callee
            let action = null
            // determine action & resource
            CRUD_METHODS.forEach(method => {
              if (
                (callee.property && callee.property.name === method) ||
                (callee.type === "Identifier" && callee.name === method)
              ) {
                action = method
              }
            })
            if (!action) return

            // find the closest statement
            const parentStmt = call.parentPath.parentPath
            const resourceName = (() => {
              // User.create → User (lowercase) → 'user'
              if (callee.object && callee.object.name) {
                return callee.object.name.toLowerCase()
              }
              // create(req.body) → use function name if possible
              if (path.node.declaration.id) {
                return path.node.declaration.id.name.replace(/Controller$/, "").toLowerCase()
              }
              return "resource"
            })()

            // build event string
            const eventName = (
              resourceName +
              {
                save: "Created",
                create: "Created",
                findByIdAndUpdate: "Updated",
                findOneAndUpdate: "Updated",
                updateOne: "Updated",
                updateMany: "Updated",
                findByIdAndDelete: "Deleted",
                findOneAndDelete: "Deleted",
                deleteOne: "Deleted",
                deleteMany: "Deleted"
              }[action]
            )

            // build emit arguments
            let emitArgs = [j.literal(eventName), j.objectExpression([])]
            if (["create", "save"].includes(action)) {
              // result variable
              emitArgs[1] = j.objectExpression([
                j.property("init", j.identifier("id"), j.memberExpression(call.parentPath.node, j.identifier("_id"))),
                j.property("init", j.identifier("data"), call.parentPath.node)
              ])
            } else if (action.includes("Update")) {
              emitArgs[1] = j.objectExpression([
                j.property("init", j.identifier("id"), j.memberExpression(call.parentPath.node, j.identifier("_id"))),
                j.property("init", j.identifier("data"), call.parentPath.node)
              ])
            } else {
              // delete
              // assume first argument is id
              emitArgs[1] = j.objectExpression([
                j.property("init", j.identifier("id"), call.parentPath.node.arguments[0] || j.literal(null))
              ])
            }

            // insert io.emit after the parent statement
            parentStmt.insertAfter(
              j.expressionStatement(
                j.callExpression(
                  j.memberExpression(j.identifier("io"), j.identifier("emit")),
                  emitArgs
                )
              )
            )
          })
      }
    })

  return root.toSource({ quote: "single" })
}
