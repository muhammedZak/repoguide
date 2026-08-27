export const DEFAULT_MAX_AI_DOCUMENTS = 20;
export const DEFAULT_MAX_AI_DOCUMENT_BYTES = 20 * 1024;
export const DEFAULT_MAX_AI_CONTEXT_BYTES = 300 * 1024;

function validateNonNegativeInteger(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer`);
  }
}

function truncateToBytes(value, maximumBytes) {
  if (Buffer.byteLength(value) <= maximumBytes) {
    return { text: value, truncated: false };
  }

  let bytes = 0;
  let endIndex = 0;

  for (const character of value) {
    const characterBytes = Buffer.byteLength(character);

    if (bytes + characterBytes > maximumBytes) {
      break;
    }

    bytes += characterBytes;
    endIndex += character.length;
  }

  return { text: value.slice(0, endIndex), truncated: true };
}

function compactPackageManifest(packageManifest) {
  return Object.fromEntries(
    ["path", "name", "version", "private", "workspaces"]
      .filter((field) => packageManifest[field] !== undefined)
      .map((field) => [field, packageManifest[field]]),
  );
}

function buildManifestEvidence(repositoryManifest) {
  return {
    repository: repositoryManifest.repository,
    packageManifests: repositoryManifest.packageManifests.map(
      compactPackageManifest,
    ),
    dependencies: repositoryManifest.dependencies,
    technologies: repositoryManifest.technologies,
    configurationFiles: repositoryManifest.configurationFiles,
    entryPointCandidates: repositoryManifest.entryPointCandidates,
    documentationFiles: repositoryManifest.documentationFiles,
    workspaceEvidence: repositoryManifest.workspaceEvidence,
  };
}

function buildDocumentBlock(path, content, truncated) {
  const truncationMarker = truncated ? "[CONTENT TRUNCATED]\n" : "";

  return `\n--- FILE: ${path} ---\n${truncationMarker}${content}\n--- END FILE: ${path} ---\n`;
}

export function buildRepositoryAIContext(
  { repositoryManifest, documents },
  {
    maxAIDocuments = DEFAULT_MAX_AI_DOCUMENTS,
    maxAIDocumentBytes = DEFAULT_MAX_AI_DOCUMENT_BYTES,
    maxAIContextBytes = DEFAULT_MAX_AI_CONTEXT_BYTES,
  } = {},
) {
  validateNonNegativeInteger(maxAIDocuments, "maxAIDocuments");
  validateNonNegativeInteger(maxAIDocumentBytes, "maxAIDocumentBytes");
  validateNonNegativeInteger(maxAIContextBytes, "maxAIContextBytes");

  const manifestJSON = JSON.stringify(
    buildManifestEvidence(repositoryManifest),
    null,
    2,
  );
  const manifestHeader = "REPOSITORY EVIDENCE MANIFEST\n";
  const manifestBlock = `${manifestHeader}${manifestJSON}\n`;
  let context = manifestBlock;
  let manifestTruncated = false;

  if (Buffer.byteLength(manifestBlock) > maxAIContextBytes) {
    const marker = "[MANIFEST TRUNCATED TO AI CONTEXT LIMIT]\n";
    const prefix = truncateToBytes(
      `${manifestHeader}${marker}`,
      maxAIContextBytes,
    ).text;
    const remainingBytes = maxAIContextBytes - Buffer.byteLength(prefix);

    context = `${prefix}${truncateToBytes(manifestJSON, remainingBytes).text}`;
    manifestTruncated = true;
  }

  const consideredDocuments = documents.slice(0, maxAIDocuments);
  const documentPaths = [];
  let truncatedDocuments = 0;

  if (!manifestTruncated && consideredDocuments.length > 0) {
    const documentsHeader = "\nSELECTED REPOSITORY DOCUMENTS\n";

    if (
      Buffer.byteLength(context) + Buffer.byteLength(documentsHeader) <=
      maxAIContextBytes
    ) {
      context += documentsHeader;
    }
  }

  for (const document of consideredDocuments) {
    if (manifestTruncated) {
      break;
    }

    const perDocumentExcerpt = truncateToBytes(
      document.content,
      maxAIDocumentBytes,
    );
    let excerpt = perDocumentExcerpt.text;
    let truncated = perDocumentExcerpt.truncated;
    let block = buildDocumentBlock(document.path, excerpt, truncated);
    const remainingBytes = maxAIContextBytes - Buffer.byteLength(context);

    if (Buffer.byteLength(block) > remainingBytes) {
      const emptyTruncatedBlock = buildDocumentBlock(document.path, "", true);
      const contentBudget =
        remainingBytes - Buffer.byteLength(emptyTruncatedBlock);

      if (contentBudget < 0) {
        break;
      }

      excerpt = truncateToBytes(excerpt, contentBudget).text;
      truncated = true;
      block = buildDocumentBlock(document.path, excerpt, truncated);
    }

    context += block;
    documentPaths.push(document.path);

    if (truncated) {
      truncatedDocuments += 1;
    }
  }

  return {
    context,
    documentPaths,
    summary: {
      documentsConsidered: consideredDocuments.length,
      documentsIncluded: documentPaths.length,
      documentsTruncated: truncatedDocuments,
      documentLimitExcluded: documents.length - consideredDocuments.length,
      contextLimitExcluded:
        consideredDocuments.length - documentPaths.length,
      manifestTruncated,
      contextBytes: Buffer.byteLength(context),
    },
  };
}
