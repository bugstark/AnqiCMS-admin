import React from 'react';
import { PageContainer } from '@ant-design/pro-layout';
import ProForm, {
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
  ProFormRadio,
  ProFormDigit,
  ProFormCheckbox,
  ProFormInstance,
  ProFormDateTimePicker,
} from '@ant-design/pro-form';
import { message, Collapse, Card, Row, Col, Image, Modal, Button } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import WangEditor from '@/components/editor';
import Keywords from '@/components/keywords';
import { history } from 'umi';
import { getTags } from '@/services/tag';
import moment from 'moment';
import { getStore, removeStore, setStore } from '@/utils/store';
import AttachmentSelect from '@/components/attachment';
import {
  getArchiveInfo,
  saveArchive,
  getCategories,
  getCategoryInfo,
  getModules,
  pluginGetUserGroups,
  getDesignTemplateFiles,
  deleteArchiveImage,
} from '@/services';
import AiGenerate from '@/components/aiGenerate';
const { Panel } = Collapse;

export default class ArchiveForm extends React.Component {
  state: { [key: string]: any } = {
    fetched: false,
    archive: { extra: {}, content: '', flag: [] },
    content: '',
    modules: [],
    module: { fields: [] },

    keywordsVisible: false,
    searchedTags: [],

    aiVisible: false,
    aiTitle: '',
  };

  submitted = false;
  defaultContent = '';

  formRef = React.createRef<ProFormInstance>();

  editorRef = React.createRef<any>();

  componentDidMount = async () => {
    const res = await getModules();
    this.setState({
      modules: res.data || [],
    });

    const moduleId = history.location.query?.module_id || 1;
    let categoryId = history.location.query?.category_id || 0;
    const lastCategoryId = getStore('last_category_id') || 0;
    if (categoryId == 0 && lastCategoryId > 0) {
      categoryId = lastCategoryId;
    }
    let id = history.location.query?.id || 0;
    if (id == 'new') {
      id = 0;
    }
    if (id > 0) {
      this.getArchive(Number(id));
    } else {
      const copyId = history.location.query?.copyid || 0;
      if (copyId > 0) {
        this.getArchive(Number(copyId), true);
      } else {
        const archive = getStore('unsaveArchive');
        if (archive) {
          console.log('load store');
          categoryId = archive.category_id;
          this.setState({
            archive,
          });
        }
        this.defaultContent = archive?.content || '';
        this.setState({
          fetched: true,
          content: archive?.content || '',
        });
      }
    }

    if (categoryId > 0) {
      this.getArchiveCategory(Number(categoryId));
    } else {
      // 先默认是文章
      this.getModule(Number(moduleId));
    }

    window.addEventListener('beforeunload', this.beforeunload);
  };

  beforeunload = (e: any) => {
    let archive = this.state.archive;
    if (!archive.id && !this.submitted) {
      console.log('save-store');
      const values = this.formRef.current?.getFieldsValue();
      archive.content = this.state.content;
      archive = Object.assign(archive, values);
      if (typeof archive.flag === 'object') {
        archive.flag = archive.flag.join(',');
      }
      setStore('unsaveArchive', archive);
    }
    if (this.state.content != '' && this.state.content != this.defaultContent) {
      const confirmationMessage = '你有尚未保存的内容，直接离开会导致内容丢失，确定要离开吗？';
      (e || window.event).returnValue = confirmationMessage;
      return confirmationMessage;
    }

    return null;
  };

  componentWillUnmount() {
    let archive = this.state.archive;
    if (!archive.id && !this.submitted) {
      console.log('save-store');
      const values = this.formRef.current?.getFieldsValue();
      archive.content = this.state.content;
      archive = Object.assign(archive, values);
      if (typeof archive.flag === 'object') {
        archive.flag = archive.flag.join(',');
      }
      setStore('unsaveArchive', archive);
    }
    window.removeEventListener('beforeunload', this.beforeunload);
  }

  getArchive = async (id: number, copy?: boolean) => {
    const res = await getArchiveInfo({
      id: id,
    });
    const archive = res.data || { extra: {}, flag: null };
    if (copy) {
      archive.id = 0;
      archive.url_token = '';
      archive.created_time = 0;
      archive.updated_time = 0;
    }
    let content = archive.data?.content || '';
    if (content.length > 0 && content[0] != '<') {
      content = '<p>' + content + '</p>';
    }
    archive.flag = archive.flag?.split(',') || [];
    archive.created_moment = moment(archive.created_time * 1000);
    this.defaultContent = content;
    this.getModule(archive.module_id);
    this.getArchiveCategory(archive.category_id);
    this.setState({
      fetched: true,
      archive: archive,
      content: content,
    });
  };

  getArchiveCategory = async (categoryId: number) => {
    const res = await getCategoryInfo({
      id: categoryId,
    });
    const category = res.data || {};
    if (category.module_id) {
      // 设置用户选择
      this.formRef.current?.setFieldsValue({ category_id: categoryId });

      this.getModule(category.module_id);
    }
  };

  onChangeSelectCategory = (e: any) => {
    setStore('last_category_id', e);
    this.getArchiveCategory(e);
  };

  getModule = async (moduleId: number) => {
    if (this.state.module.id == moduleId) {
      return;
    }
    let module = { fields: [] };
    for (const item of this.state.modules) {
      if (item.id == moduleId) {
        module = item;
        break;
      }
    }
    this.setState({
      module: module,
    });
  };

  setContent = async (html: string) => {
    this.setState({
      content: html,
    });
  };

  handleSelectImages = (row: any) => {
    const { archive } = this.state;
    let exists = false;
    if (!archive.images) {
      archive.images = [];
    }
    for (const i in archive.images) {
      if (archive.images[i] == row.logo) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      archive.images.push(row.logo);
    }
    this.setState({
      archive,
    });
    message.success('上传完成');
  };

  handleCleanLogo = (index: number, e: any) => {
    e.stopPropagation();
    const { archive } = this.state;
    // 请求接口删除
    deleteArchiveImage({ id: archive.id, image_index: index })
      .then((res) => {
        archive.logo = '';
        archive.images.splice(index, 1);
        this.setState({
          archive,
        });
      })
      .catch(() => {});
  };

  handleChooseKeywords = () => {
    this.setState({
      keywordsVisible: true,
    });
  };

  handleHideKeywords = () => {
    this.setState({
      keywordsVisible: false,
    });
  };

  handleSelectedKeywords = async (values: string[]) => {
    const keywords = (this.formRef?.current?.getFieldValue('keywords') || '').split(',');
    for (const item of values) {
      if (keywords.indexOf(item) === -1) {
        keywords.push(item);
      }
    }
    this.formRef?.current?.setFieldsValue({
      keywords: keywords.join(',').replace(/^,+/, '').replace(/,+$/, ''),
    });
    this.handleHideKeywords();
  };

  onChangeTagInput = (e: any) => {
    const value = e.target?.value || '';
    getTags({
      type: 1,
      title: value,
      pageSize: 10,
    }).then((res) => {
      const data = res.data || [];
      const result = {};
      for (const item of data) {
        result[item.title] = item.title;
      }
      this.setState({
        searchedTags: result,
      });
    });
  };

  onSubmit = async (values: any) => {
    const { archive, content } = this.state;
    const postData = Object.assign(archive, values);
    postData.price = Number(values.price);
    postData.stock = Number(values.stock);
    // 必须选择分类
    if (!postData.category_id || postData.category_id == 0) {
      message.error('请选择文档分类');
      return;
    }
    const hide = message.loading('正在提交中', 0);
    postData.content = content;
    if (typeof postData.flag === 'object') {
      postData.flag = postData.flag.join(',');
    }
    const res = await saveArchive(postData);
    hide();
    if (res.code != 0) {
      if (res.data && res.data.id) {
        // 提示
        Modal.confirm({
          title: res.msg,
          content: '是否需要继续提交？',
          cancelText: '返回修改',
          okText: '强制提交',
          onOk: () => {
            values.force_save = true;
            this.onSubmit(values);
          },
        });
        return;
      }
      message.error(res.msg);
    } else {
      removeStore('unsaveArchive');
      this.submitted = true;
      message.success(res.msg);
      history.goBack();
    }
  };

  handleCleanExtraField = (field: string) => {
    const extra = {};
    extra[field] = { value: '' };
    this.formRef?.current?.setFieldsValue({ extra });

    const { archive } = this.state;
    delete archive.extra[field];
    this.setState({
      archive,
    });
  };

  handleUploadExtraField = (field: string, row: any) => {
    const extra = {};
    extra[field] = { value: row.logo };
    this.formRef?.current?.setFieldsValue({ extra });
    const { archive } = this.state;
    if (!archive.extra[field]) {
      archive.extra[field] = {};
    }
    archive.extra[field].value = row.logo;

    this.setState({
      archive,
    });
  };

  handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      const values = this.formRef.current?.getFieldsValue();
      // 自动保存
      this.onSubmit(values);

      event.preventDefault();
    }
  };

  aiGenerateArticle = () => {
    const values = this.formRef.current?.getFieldsValue() || {};
    this.setState({
      aiTitle: values.title,
      aiVisible: true,
    });
  };

  onHideAiGenerate = () => {
    this.setState({
      aiVisible: false,
    });
  };

  onFinishAiGenerate = async (values: any) => {
    this.onHideAiGenerate();
    this.formRef.current?.setFieldsValue({ title: values.title });
    //
    let content = values.content.trim();

    this.setContent(content);
    this.editorRef.current?.setInnerContent(content);
  };

  render() {
    const { archive, content, module, fetched, keywordsVisible, searchedTags, aiTitle, aiVisible } =
      this.state;
    return (
      <PageContainer title={(archive.id > 0 ? '修改' : '添加') + '文档'}>
        <Card onKeyDown={this.handleKeyDown}>
          {fetched && (
            <ProForm
              initialValues={archive}
              layout="horizontal"
              formRef={this.formRef}
              onFinish={this.onSubmit}
            >
              <Row gutter={20}>
                <Col span={18}>
                  <ProFormText name="title" label={module.title_name || '文档标题'} />
                  <ProFormCheckbox.Group
                    name="flag"
                    label="推荐属性"
                    valueEnum={{
                      h: '头条[h]',
                      c: '推荐[c]',
                      f: '幻灯[f]',
                      a: '特荐[a]',
                      s: '滚动[s]',
                      b: '加粗[h]',
                      p: '图片[p]',
                      j: '跳转[j]',
                    }}
                  />
                  <ProFormText
                    name="keywords"
                    label="文章关键词"
                    fieldProps={{
                      suffix: (
                        <span className="link" onClick={this.handleChooseKeywords}>
                          选择关键词
                        </span>
                      ),
                    }}
                  />
                  <ProFormTextArea name="description" label="文章简介" />

                  <Collapse>
                    <Panel header="其他参数" key="1">
                      <Row gutter={20}>
                        <Col span={12}>
                          <ProFormText
                            label="原文地址"
                            name="origin_url"
                            placeholder="默认不用填写"
                            extra="文章的原文地址，默认不用管"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormText
                            name="seo_title"
                            label="SEO标题"
                            placeholder="默认为文章标题，无需填写"
                            extra="注意：如果你希望页面的title标签的内容不是文章标题，可以通过SEO标题设置"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormText
                            name="canonical_url"
                            label="规范的链接"
                            placeholder="默认是文档链接，无需填写"
                            extra="注意：如果你想将当前的文档指向到另外的页面，才需要在这里填写"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormText
                            name="fixed_link"
                            label="固定链接"
                            placeholder="默认是文档链接，无需填写"
                            extra="注意：只有你想把这个文档的链接持久固定，不随伪静态规则改变，才需要填写。 相对链接 / 开头"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormSelect
                            label="文档模板"
                            showSearch
                            name="template"
                            request={async () => {
                              const res = await getDesignTemplateFiles({});
                              const data = [{ path: '', remark: '默认模板' }].concat(
                                res.data || [],
                              );
                              for (const i in data) {
                                if (!data[i].remark) {
                                  data[i].remark = data[i].path;
                                } else {
                                  data[i].remark = data[i].path + '(' + data[i].remark + ')';
                                }
                              }
                              return data;
                            }}
                            fieldProps={{
                              fieldNames: {
                                label: 'remark',
                                value: 'path',
                              },
                            }}
                            extra="默认跟随分类的内容模板"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormDigit
                            label="价格"
                            name="price"
                            fieldProps={{ precision: 0, addonAfter: '分' }}
                            extra="注意，单位是分，比如1元，这里就要填100"
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormDigit
                            label="库存"
                            name="stock"
                            fieldProps={{ precision: 0, addonAfter: '件' }}
                          />
                        </Col>
                        <Col span={12}>
                          <ProFormSelect
                            name="read_level"
                            label="阅读等级"
                            request={async () => {
                              const res = await pluginGetUserGroups({});
                              return [{ level: 0, title: '不限制', id: 0 }].concat(res.data || []);
                            }}
                            fieldProps={{
                              fieldNames: {
                                label: 'title',
                                value: 'level',
                              },
                              optionItemRender(item) {
                                return (
                                  <div
                                    dangerouslySetInnerHTML={{
                                      __html: 'L' + item.level + item.title,
                                    }}
                                  ></div>
                                );
                              },
                            }}
                            extra="如果选择了阅读等级，则要求用户登录并达到指定等级才能阅读"
                          />
                        </Col>
                        {module.fields?.map((item: any, index: number) => (
                          <Col span={12} key={index}>
                            {item.type === 'text' ? (
                              <ProFormText
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                required={item.required ? true : false}
                                placeholder={item.content && '默认值：' + item.content}
                              />
                            ) : item.type === 'number' ? (
                              <ProFormDigit
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                required={item.required ? true : false}
                                placeholder={item.content && '默认值：' + item.content}
                              />
                            ) : item.type === 'textarea' ? (
                              <ProFormTextArea
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                required={item.required ? true : false}
                                placeholder={item.content && '默认值：' + item.content}
                              />
                            ) : item.type === 'radio' ? (
                              <ProFormRadio.Group
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                request={async () => {
                                  const tmpData = item.content.split('\n');
                                  const data = [];
                                  for (const item1 of tmpData) {
                                    data.push({ label: item1, value: item1 });
                                  }
                                  return data;
                                }}
                              />
                            ) : item.type === 'checkbox' ? (
                              <ProFormCheckbox.Group
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                request={async () => {
                                  const tmpData = item.content.split('\n');
                                  const data = [];
                                  for (const item1 of tmpData) {
                                    data.push({ label: item1, value: item1 });
                                  }
                                  return data;
                                }}
                              />
                            ) : item.type === 'select' ? (
                              <ProFormSelect
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                                request={async () => {
                                  const tmpData = item.content.split('\n');
                                  const data = [];
                                  for (const item1 of tmpData) {
                                    data.push({ label: item1, value: item1 });
                                  }
                                  return data;
                                }}
                              />
                            ) : item.type === 'image' ? (
                              <ProFormText
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                              >
                                {archive.extra[item.field_name]?.value ? (
                                  <div className="ant-upload-item">
                                    <Image
                                      preview={{
                                        src: archive.extra[item.field_name]?.value,
                                      }}
                                      src={archive.extra[item.field_name]?.value}
                                    />
                                    <span
                                      className="delete"
                                      onClick={this.handleCleanExtraField.bind(
                                        this,
                                        item.field_name,
                                      )}
                                    >
                                      <DeleteOutlined />
                                    </span>
                                  </div>
                                ) : (
                                  <AttachmentSelect
                                    onSelect={this.handleUploadExtraField.bind(
                                      this,
                                      item.field_name,
                                    )}
                                    visible={false}
                                  >
                                    <div className="ant-upload-item">
                                      <div className="add">
                                        <PlusOutlined />
                                        <div style={{ marginTop: 8 }}>上传</div>
                                      </div>
                                    </div>
                                  </AttachmentSelect>
                                )}
                              </ProFormText>
                            ) : item.type === 'file' ? (
                              <ProFormText
                                name={['extra', item.field_name, 'value']}
                                label={item.name}
                              >
                                {archive.extra[item.field_name]?.value ? (
                                  <div className="ant-upload-item ant-upload-file">
                                    <span>{archive.extra[item.field_name]?.value}</span>
                                    <span
                                      className="delete"
                                      onClick={this.handleCleanExtraField.bind(
                                        this,
                                        item.field_name,
                                      )}
                                    >
                                      <DeleteOutlined />
                                    </span>
                                  </div>
                                ) : (
                                  <AttachmentSelect
                                    onSelect={this.handleUploadExtraField.bind(
                                      this,
                                      item.field_name,
                                    )}
                                    visible={false}
                                  >
                                    <Button>上传</Button>
                                  </AttachmentSelect>
                                )}
                              </ProFormText>
                            ) : (
                              ''
                            )}
                          </Col>
                        ))}
                      </Row>
                    </Panel>
                  </Collapse>
                  <WangEditor
                    className="mb-normal"
                    setContent={this.setContent}
                    content={content}
                    ref={this.editorRef}
                  />
                </Col>
                <Col span={6}>
                  <div className="mb-normal">
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <Button
                          block
                          type="primary"
                          onClick={() => {
                            this.onSubmit(this.formRef.current?.getFieldsValue());
                          }}
                        >
                          提交
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            const values = this.formRef.current?.getFieldsValue() || {};
                            values.draft = true;
                            this.onSubmit(values);
                          }}
                        >
                          存草稿
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            this.aiGenerateArticle();
                          }}
                        >
                          AI写作
                        </Button>
                      </Col>
                      <Col span={12}>
                        <Button
                          block
                          onClick={() => {
                            history.goBack();
                          }}
                        >
                          返回
                        </Button>
                      </Col>
                    </Row>
                  </div>
                  <Card className="aside-card" size="small" title="所属分类">
                    <ProFormSelect
                      //label="所属分类"
                      showSearch
                      name="category_id"
                      width="lg"
                      request={async () => {
                        const res = await getCategories({ type: 1 });
                        const categories = res.data || [];
                        if (categories.length == 0) {
                          Modal.error({
                            title: '请先创建分类，再来发布文档',
                            onOk: () => {
                              history.push('/archive/category');
                            },
                          });
                        }
                        return categories;
                      }}
                      fieldProps={{
                        fieldNames: {
                          label: 'title',
                          value: 'id',
                        },
                        optionItemRender(item) {
                          return (
                            <div
                              dangerouslySetInnerHTML={{ __html: item.spacer + item.title }}
                            ></div>
                          );
                        },
                        onChange: this.onChangeSelectCategory,
                      }}
                      extra={<div>内容模型：{module.title}</div>}
                    />
                  </Card>
                  <Card className="aside-card" size="small" title="文章图片">
                    <ProFormText>
                      {archive.images?.length
                        ? archive.images.map((item: string, index: number) => (
                            <div className="ant-upload-item" key={index}>
                              <Image
                                preview={{
                                  src: item,
                                }}
                                src={item}
                              />
                              <span
                                className="delete"
                                onClick={this.handleCleanLogo.bind(this, index)}
                              >
                                <DeleteOutlined />
                              </span>
                            </div>
                          ))
                        : null}
                      <AttachmentSelect onSelect={this.handleSelectImages} visible={false}>
                        <div className="ant-upload-item">
                          <div className="add">
                            <PlusOutlined />
                            <div style={{ marginTop: 8 }}>上传</div>
                          </div>
                        </div>
                      </AttachmentSelect>
                    </ProFormText>
                  </Card>
                  <Card className="aside-card" size="small" title="URL别名">
                    <ProFormText
                      name="url_token"
                      placeholder="默认会自动生成，无需填写"
                      extra="注意：URL别名只能填写字母、数字和下划线，不能带空格"
                    />
                  </Card>
                  <Card className="aside-card" size="small" title="发布时间">
                    <ProFormDateTimePicker
                      name="created_moment"
                      placeholder="默认会自动生成，无需填写"
                      extra="如果你选择的是未来的时间，则会被放入到待发布列表，等待时间到了才会正式发布"
                      transform={(value) => {
                        return {
                          created_time: value ? moment(value).unix() : 0,
                        };
                      }}
                    />
                  </Card>
                  <Card className="aside-card" size="small" title="Tag标签">
                    <ProFormSelect
                      mode="tags"
                      name="tags"
                      valueEnum={searchedTags}
                      placeholder="可以输入或选择标签，多个标签可用,分隔"
                      fieldProps={{
                        tokenSeparators: [',', '，'],
                        onInputKeyDown: this.onChangeTagInput,
                        onFocus: this.onChangeTagInput,
                      }}
                      extra="可以输入或选择标签，多个标签可用,分隔"
                    />
                  </Card>
                </Col>
              </Row>
            </ProForm>
          )}
        </Card>
        {keywordsVisible && (
          <Keywords
            visible={keywordsVisible}
            onCancel={this.handleHideKeywords}
            onSubmit={this.handleSelectedKeywords}
          />
        )}
        {aiVisible && (
          <AiGenerate
            visible={aiVisible}
            title={aiTitle}
            onCancel={this.onHideAiGenerate}
            onSubmit={this.onFinishAiGenerate}
          />
        )}
      </PageContainer>
    );
  }
}
