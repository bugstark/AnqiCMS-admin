import React, { useRef, useState } from 'react';
import { Button, Input, message, Modal, Space } from 'antd';
import {
  deleteAttachmentCategory,
  getAttachmentCategories,
  saveAttachmentCategory,
} from '@/services/attachment';
import ProTable, { ActionType, ProColumns } from '@ant-design/pro-table';

export type AttachmentCategoryProps = {
  onCancel: (flag?: boolean) => void;
};

const AttachmentCategory: React.FC<AttachmentCategoryProps> = (props) => {
  const actionRef = useRef<ActionType>();
  const [visible, setVisible] = useState<boolean>(false);
  const [editVisbile, setEditVisible] = useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<any>({});
  const [editingInput, setEditingInput] = useState<string>('');

  const handleAddCategory = () => {
    setEditingCategory({});
    setEditingInput('');
    setEditVisible(true);
  };

  const handleEditCategory = (record: any) => {
    setEditingCategory(record);
    setEditingInput(record.title);
    setEditVisible(true);
  };

  const handleRemove = async (record: any) => {
    Modal.confirm({
      title: '确定要删除吗？',
      onOk: async () => {
        let res = await deleteAttachmentCategory(record);

        message.info(res.msg);
        actionRef.current?.reloadAndRest?.();
      },
    });
  };

  const handleSaveCategory = () => {
    const hide = message.loading('正在提交中', 0);
    saveAttachmentCategory({
      id: editingCategory.id,
      title: editingInput,
    })
      .then((res) => {
        if (res.code === 0) {
          setEditVisible(false);

          actionRef.current?.reloadAndRest?.();
        } else {
          message.error(res.msg);
        }
      })
      .catch((err) => {
        console.log(err);
      })
      .finally(() => {
        hide();
      });
  };

  const columns: ProColumns<any>[] = [
    {
      title: 'ID',
      dataIndex: 'id',
      width: 60,
    },
    {
      title: '分类名称',
      dataIndex: 'title',
    },
    {
      title: '资源数量',
      dataIndex: 'attach_count',
      width: 80,
    },
    {
      title: '操作',
      dataIndex: 'option',
      valueType: 'option',
      width: 120,
      render: (_, record) => (
        <Space size={20}>
          <a
            key="edit"
            onClick={() => {
              handleEditCategory(record);
            }}
          >
            编辑
          </a>
          <a
            className="text-red"
            key="delete"
            onClick={async () => {
              await handleRemove(record);
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
    <>
      <div
        onClick={() => {
          setVisible(!visible);
        }}
      >
        {props.children}
      </div>
      <Modal
        visible={visible}
        title={
          <Button
            type="primary"
            onClick={() => {
              handleAddCategory();
            }}
          >
            新增分类
          </Button>
        }
        width={600}
        onCancel={() => {
          setVisible(false);
          props.onCancel();
        }}
        footer={false}
      >
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <ProTable<any>
            headerTitle="内容素材管理"
            actionRef={actionRef}
            rowKey="id"
            search={false}
            toolBarRender={false}
            request={(params, sort) => {
              return getAttachmentCategories(params);
            }}
            columns={columns}
          />
        </div>
      </Modal>
      <Modal
        visible={editVisbile}
        title={editingCategory.id ? '重命名分类：' + editingCategory.title : '新增分类'}
        width={480}
        zIndex={2000}
        okText="确认"
        cancelText="取消"
        maskClosable={false}
        onOk={handleSaveCategory}
        onCancel={() => {
          setEditVisible(false);
        }}
      >
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
          <div>请填写分类名称: </div>
          <Input
            size="large"
            value={editingInput}
            onChange={(e) => {
              setEditingInput(e.target.value);
            }}
          />
        </div>
      </Modal>
    </>
  );
};

export default AttachmentCategory;
