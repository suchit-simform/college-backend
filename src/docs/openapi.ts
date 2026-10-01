type Field = { type: string; example?: unknown };

function crudPaths(tag: string, basePath: string, schema: string) {
  const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
  const json = (schemaRef: object) => ({ "application/json": { schema: schemaRef } });
  const idParam = { name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } };
  const errors = {
    400: { description: "Validation failed", content: json(ref("Error")) },
    404: { description: "Not found", content: json(ref("Error")) },
  };

  return {
    [basePath]: {
      get: {
        tags: [tag],
        summary: `List ${tag.toLowerCase()} with pagination and name filter`,
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 10 } },
          { name: "name", in: "query", description: "Case-insensitive partial match", schema: { type: "string" } },
        ],
        responses: {
          200: {
            description: "Paginated list",
            content: json({
              type: "object",
              properties: { data: { type: "array", items: ref(schema) }, meta: ref("PaginationMeta") },
            }),
          },
          400: errors[400],
        },
      },
      post: {
        tags: [tag],
        summary: `Create a ${schema.toLowerCase()}`,
        requestBody: { required: true, content: json(ref(`${schema}Input`)) },
        responses: {
          201: { description: "Created", content: json(ref(schema)) },
          400: errors[400],
          409: { description: "Unique constraint conflict", content: json(ref("Error")) },
        },
      },
    },
    [`${basePath}/{id}`]: {
      get: {
        tags: [tag],
        summary: `Get a ${schema.toLowerCase()} by id`,
        parameters: [idParam],
        responses: { 200: { description: "Found", content: json(ref(schema)) }, ...errors },
      },
      put: {
        tags: [tag],
        summary: `Update a ${schema.toLowerCase()} (partial fields allowed)`,
        parameters: [idParam],
        requestBody: { required: true, content: json(ref(`${schema}Input`)) },
        responses: {
          200: { description: "Updated", content: json(ref(schema)) },
          ...errors,
          409: { description: "Unique constraint conflict", content: json(ref("Error")) },
        },
      },
      delete: {
        tags: [tag],
        summary: `Delete a ${schema.toLowerCase()}`,
        parameters: [idParam],
        responses: { 204: { description: "Deleted" }, ...errors },
      },
    },
  };
}

function objectSchema(fields: Record<string, Field>, withId: boolean) {
  const properties = withId ? { id: { type: "integer", example: 1 }, ...fields } : fields;
  return { type: "object", required: Object.keys(properties), properties };
}

const studentFields = {
  name: { type: "string", example: "Aarav Patel" },
  enrollmentNumber: { type: "string", example: "ENR202600001" },
};

const teacherFields = {
  name: { type: "string", example: "Dr. Meera Shah" },
  designation: { type: "string", example: "Professor" },
  expertise: { type: "string", example: "Computer Science" },
};

export const openApiSpec = {
  openapi: "3.0.3",
  info: { title: "College Backend API", version: "1.0.0", description: "CRUD API for students and teachers" },
  servers: [{ url: "/api" }],
  tags: [{ name: "Students" }, { name: "Teachers" }],
  paths: {
    ...crudPaths("Students", "/students", "Student"),
    ...crudPaths("Teachers", "/teachers", "Teacher"),
  },
  components: {
    schemas: {
      Student: objectSchema(studentFields, true),
      StudentInput: objectSchema(studentFields, false),
      Teacher: objectSchema(teacherFields, true),
      TeacherInput: objectSchema(teacherFields, false),
      PaginationMeta: {
        type: "object",
        properties: {
          page: { type: "integer", example: 1 },
          limit: { type: "integer", example: 10 },
          total: { type: "integer", example: 500 },
          totalPages: { type: "integer", example: 50 },
        },
      },
      Error: {
        type: "object",
        properties: { error: { type: "string" }, details: { type: "array", items: { type: "object" } } },
      },
    },
  },
};
