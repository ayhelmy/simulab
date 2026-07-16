'use client';

import React, { useMemo } from 'react';
import { Tree, Spin, Typography, Empty } from 'antd';
import type { DataNode } from 'antd/es/tree';
import type { SimulationCatalog } from '@/types';
import { CaretDownOutlined, CaretLeftOutlined, CaretRightOutlined, CaretUpOutlined, DownOutlined } from '@ant-design/icons/es/icons/index';

const { Text } = Typography;

interface Props {
  catalogs: SimulationCatalog[];
  loading: boolean;
  selectedKeys: string[];
  onSelect: (keys: string[], includeChildren: boolean) => void;
}

function catalogToTreeData(nodes: SimulationCatalog[]): DataNode[] {
  return nodes.map((node) => ({
    key:      node.id,
    title:    (
      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>{node.name}</span>
        {/* {node.itemCount !== undefined && (
          <Text type="secondary" style={{ fontSize: 11 }}>({node.itemCount})</Text>
        )} */}
      </span>
    ),
    children: node.children?.length ? catalogToTreeData(node.children) : undefined,
    isLeaf:   !node.children?.length,
  }));
}

export default function CatalogTreeFilter({
  catalogs, loading, selectedKeys, onSelect,
}: Props) {
  const treeData = useMemo(() => catalogToTreeData(catalogs), [catalogs]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
        <Spin size="small" aria-label="Loading catalog tree" />
      </div>
    );
  }

  if (!loading && catalogs.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No catalogs available"
        style={{ margin: '16px 0' }}
      />
    );
  }

  return (
    <Tree
      treeData={treeData}
      selectedKeys={selectedKeys}
      
      onSelect={(keys, info) => {
        const key = keys[0] as string | undefined;
        if (!key) {
          onSelect([], false);
          return;
        }
        // Selecting a parent node → include subtree
        const hasChildren = !info.node.isLeaf;
        onSelect([key], hasChildren);
      }}
      defaultExpandAll={false}
      blockNode
      showLine={false}
      style={{ background: 'transparent' }}
      aria-label="Simulation catalog tree"

  switcherIcon={({ expanded }) => (
        <CaretLeftOutlined
          style={{ transform: `rotate(${expanded ? 0 : -90}deg)`, transition: 'transform 0.3s' , color: '#F59324'}}
        />
      )}


    />
  );
}
