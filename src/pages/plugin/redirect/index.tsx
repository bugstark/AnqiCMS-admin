import { PlusOutlined } from '@ant-design/icons';
import { Button, message, Modal, Space } from 'antd';
import React, { useState, useRef } from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import type { ProColumns, ActionType } from '@ant-design/pro-table';
import ProTable from '@ant-design/pro-table';
import { pluginDeleteRedirect, pluginGetRedirects } from '@/services/plugin/redirect';
import RedirectImport from './components/import';
import RedirectForm from './components/redirectForm';

const PluginRedirect: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<any[]>([]);
  const [currentRedirect, setCurrentRedirect] = useState<any>({});
  const [editVisible, setEditVisible] = useState<boolean>(false);

  const handleRemove = async (selectedRowKeys: any[]) => {
    Modal.confirm({
      title: '确定要删除选中的链接吗？',
      onOk: async () => {
        const hide = message.loading('正在删除', 0);
        if (!selectedRowKeys) return true;
        try {
          for (let item of selectedRowKeys) {
            await pluginDeleteRedirect({
              id: item,
            });
          }
          hide();
          message.success('删除成功');
          if (actionRef.current) {
            actionRef.current.reload();
          }
          return true;
        } catch (error) {
          hide();
          message.error('删除失败');
          return true;
        }
      },
    });
  };

  const handleEditRedirect = async (record: any) => {
    setCurrentRedirect(record);
    setEditVisible(true);
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
    },
    {
      title: '源链接',
      dataIndex: 'from_url',
    },
    {
      title: '跳转链接',
      dataIndex: 'to_url',
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      render: (_, record) => (
        <Space size={20}>
          <a
            key="edit"
            onClick={() => {
              handleEditRedirect(record);
            }}
          >
            编辑
          </a>
          <a
            className="text-red"
            key="delete"
            onClick={async () => {
              await handleRemove([record.id]);
              setSelectedRowKeys([]);
              actionRef.current?.reloadAndRest?.();
            }}
          >
            删除
          </a>
        </Space>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle="301跳转管理"
        actionRef={actionRef}
        rowKey="id"
        search={false}
        toolBarRender={() => [
          <Button
            type="primary"
            key="add"
            onClick={() => {
              handleEditRedirect({});
            }}
          >
            <PlusOutlined /> 添加链接
          </Button>,
          <RedirectImport
            onCancel={() => {
              actionRef.current?.reloadAndRest?.();
            }}
          >
            <Button
              key="import"
              onClick={() => {
                //todo
              }}
            >
              导入链接
            </Button>
          </RedirectImport>,
        ]}
        tableAlertOptionRender={({ selectedRowKeys, onCleanSelected }) => (
          <Space>
            <Button
              size={'small'}
              onClick={async () => {
                await handleRemove(selectedRowKeys);
                setSelectedRowKeys([]);
                actionRef.current?.reloadAndRest?.();
              }}
            >
              批量删除
            </Button>
            <Button type="link" size={'small'} onClick={onCleanSelected}>
              取消选择
            </Button>
          </Space>
        )}
        request={(params, sort) => {
          return pluginGetRedirects(params);
        }}
        columns={columns}
        rowSelection={{
          onChange: (selectedRowKeys) => {
            setSelectedRowKeys(selectedRowKeys);
          },
        }}
      />
      {editVisible && (
        <RedirectForm
          visible={editVisible}
          editingRedirect={currentRedirect}
          onCancel={() => {
            setEditVisible(false);
          }}
          onSubmit={async () => {
            setEditVisible(false);
            if (actionRef.current) {
              actionRef.current.reload();
            }
          }}
        />
      )}
    </PageContainer>
  );
};

export default PluginRedirect;
