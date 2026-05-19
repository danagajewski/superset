/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { shallowEqual, useSelector } from 'react-redux';
import { useInView } from 'react-intersection-observer';
import { omit } from 'lodash';
import { EmptyState, Input, Skeleton } from '@superset-ui/core/components';
import { t } from '@apache-superset/core/translation';
import { FeatureFlag, isFeatureEnabled } from '@superset-ui/core';
import { css, styled } from '@apache-superset/core/theme';
import { QueryResponse } from '@superset-ui/core';
import QueryTable from 'src/SqlLab/components/QueryTable';
import { SqlLabRootState } from 'src/SqlLab/types';
import { useEditorQueriesQuery } from 'src/hooks/apiResources/queries';
import useEffectEvent from 'src/hooks/useEffectEvent';
import useQueryEditor from 'src/SqlLab/hooks/useQueryEditor';
import PanelToolbar from 'src/components/PanelToolbar';
import { ViewLocations } from 'src/SqlLab/contributions';

interface QueryHistoryProps {
  queryEditorId: string | number;
  displayLimit: number;
  latestQueryId: string | undefined;
}

const StyledEmptyStateWrapper = styled.div`
  height: 100%;
  .ant-empty-image img {
    margin-right: 28px;
  }

  p {
    margin-right: 28px;
  }
`;

const TABLE_NAME_REGEX =
  /\b(?:FROM|JOIN|INTO|UPDATE|TABLE)\s+(?:[\w.]+\.)?[`"']?([\w]+)[`"']?/gi;

function extractTableNames(sql: string): string[] {
  const names: string[] = [];
  TABLE_NAME_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = TABLE_NAME_REGEX.exec(sql)) !== null) {
    names.push(match[1].toLowerCase());
  }
  return names;
}

function queryMatchesSearch(
  query: QueryResponse,
  lowerSearch: string,
): boolean {
  if (query.sql?.toLowerCase().includes(lowerSearch)) {
    return true;
  }
  const tableNames = extractTableNames(query.sql || '');
  return tableNames.some(name => name.includes(lowerSearch));
}

const getEditorQueries = (
  queries: SqlLabRootState['sqlLab']['queries'],
  queryEditorId: string | number,
) =>
  Object.values(queries).filter(
    ({ sqlEditorId }) => String(sqlEditorId) === String(queryEditorId),
  );

const QueryHistory = ({
  queryEditorId,
  displayLimit,
  latestQueryId,
}: QueryHistoryProps) => {
  const { id, tabViewId } = useQueryEditor(String(queryEditorId), [
    'tabViewId',
  ]);
  const editorId = tabViewId ?? id;
  const [ref, hasReachedBottom] = useInView({ threshold: 0 });
  const [pageIndex, setPageIndex] = useState(0);
  const [searchText, setSearchText] = useState('');
  const handleSearchChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value),
    [],
  );
  const queries = useSelector(
    ({ sqlLab: { queries } }: SqlLabRootState) => queries,
    shallowEqual,
  );
  const {
    currentData: data,
    isLoading,
    isFetching,
  } = useEditorQueriesQuery(
    { editorId, pageIndex },
    {
      skip: !isFeatureEnabled(FeatureFlag.SqllabBackendPersistence),
    },
  );
  const editorQueries = useMemo(
    () =>
      data
        ? getEditorQueries(
            omit(
              queries,
              data.result.map(({ id }) => id),
            ),
            editorId,
          )
            .concat(data.result)
            .sort((a, b) => {
              const aTime = a.startDttm || 0;
              const bTime = b.startDttm || 0;
              return aTime - bTime;
            })
        : getEditorQueries(queries, editorId),
    [queries, data, editorId],
  );

  const filteredQueries = useMemo(() => {
    const trimmed = searchText.trim().toLowerCase();
    if (!trimmed) {
      return editorQueries;
    }
    return editorQueries.filter(q => queryMatchesSearch(q, trimmed));
  }, [editorQueries, searchText]);

  const loadNext = useEffectEvent(() => {
    setPageIndex(pageIndex + 1);
  });

  const loadedDataCount = data?.result.length || 0;
  const totalCount = data?.count || 0;

  useEffect(() => {
    if (hasReachedBottom && loadedDataCount < totalCount) {
      loadNext();
    }
  }, [hasReachedBottom, loadNext, loadedDataCount, totalCount]);

  if (!editorQueries.length && isLoading) {
    return <Skeleton active />;
  }

  return editorQueries.length > 0 ? (
    <>
      <PanelToolbar viewId={ViewLocations.sqllab.queryHistory} />
      <Input
        css={css`
          width: 200px;
          margin-bottom: 4px;
        `}
        placeholder={t('Search query history')}
        onChange={handleSearchChange}
        value={searchText}
        allowClear
      />
      <QueryTable
        columns={[
          'state',
          'started',
          'duration',
          'progress',
          'rows',
          'sql',
          'results',
          'actions',
        ]}
        queries={filteredQueries}
        displayLimit={displayLimit}
        latestQueryId={latestQueryId}
      />
      {data && loadedDataCount < totalCount && (
        <div
          ref={ref}
          css={css`
            position: relative;
            top: -150px;
          `}
        />
      )}
      {isFetching && <Skeleton active />}
    </>
  ) : (
    <StyledEmptyStateWrapper>
      <EmptyState
        title={t('Run a query to display query history')}
        size="medium"
        image="document.svg"
      />
    </StyledEmptyStateWrapper>
  );
};

export default QueryHistory;
