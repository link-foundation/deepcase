import { Alert, AlertIcon, Box, Flex, HStack, IconButton, Popover, PopoverContent, PopoverTrigger, Portal, SlideFade, Spacer, Spinner, useDisclosure, useToast } from "@chakra-ui/react";
import { useDeep, useDeepId, useDeepQuery, useDeepSubscription } from "@deep-foundation/deeplinks/imports/client";
import { Link, useMinilinksFilter, useMinilinksHandle, useMinilinksQuery } from "@deep-foundation/deeplinks/imports/minilinks";
import { useDebounceCallback } from "@react-hook/debounce";
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { TiArrowBackOutline } from "react-icons/ti";
import { VscChromeClose, VscVersions } from "react-icons/vsc";
import { BsArrowsFullscreen, BsCheck2 } from "react-icons/bs";
import { ClientHandler } from "../client-handler";
import { CytoReactLinksCard } from "../cyto-react-links-card";
import { useContainer, useInsertingCytoStore, useUpdatingCytoStore, useLayout, useRefAutofill, useShowExtra, useShowTypes, useSpaceId, useAutoFocusOnInsert } from "../hooks";
import { LinkClientHandlerDefault } from "../link-client-handlers/default";
import { CatchErrors } from "../react-errors";
import { useEditorTabs } from "./editor";
import { useCytoFocusMethods } from "./graph";
import { useRouter } from 'next/router';
import { useQueryStore } from '@deep-foundation/store/query';
import { initializeTraveler } from "./traveler";
import { MdFolderDelete } from 'react-icons/md';
import { useOpenedMethods } from "./opened";

export interface IInsertedLink {
  position: { x: number; y: number; };
  from: number; to: number;
  alterResolve?: (link: Link<number>) => void;
  props?: any;
};

export interface IUpdatedLink {
  position: { x: number; y: number; };
  from: number; to: number;
};

const delay = (time) => new Promise(res => setTimeout(res, time));

export interface IInsertedLinkProps {
  insertingLink?: IInsertedLink;
  setInsertingLink?: (insertingLink: IInsertedLink) => void;
  ml?: any;
  ehRef?: any;
  returningRef?: any;
  insertLinkRef?: any;
}

export const FinderPopover = React.memo(function FinderPopover({
    link,
    onSubmit,
    onChange,
    onOpen,
    onClose,
    children,
    PopoverProps = {},
    PortalProps = {},
    ClientHandlerProps = {},
    query = undefined,
    search = undefined,
  }: {
    link: Link<number>;
    onSubmit: (link) => void;
    onChange?: (link) => void;
    onOpen?: () => void;
    onClose?: () => void;
    children?: any;
    PopoverProps?: any;
    PortalProps?: any;
    ClientHandlerProps?: any;
    query?: any;
    search?: string;
  }) {
  const deep = useDeep();
  const [selectedLink, setSelectedLink] = useState<Link<number>>();
  const { onOpen: _onOpen, onClose: _onClose, isOpen: _isOpen } = useDisclosure();
  const { data: Finder } = useDeepId('@deep-foundation/finder', 'Finder');
  return <Popover
    isLazy
    placement='right-start'
    onOpen={(...args) => (_onOpen(...args),(onOpen && onOpen()))} onClose={(...args) => (_onClose(...args),(onClose && onClose()))} isOpen={_isOpen}
    {...PopoverProps}
  >
    <PopoverTrigger>
      {children}
    </PopoverTrigger>
    <Portal {...PortalProps}>
      <PopoverContent h={72}>
        {!!Finder && <ClientHandler fillSize query={query} search={search}
          link={link} linkId={link?.id} context={[Finder]} ml={deep.minilinks}
          onChange={l => {
            onChange && onChange(l);
            setSelectedLink(l);
          }}
          {...(ClientHandlerProps)}
        />}
        <SlideFade in={!!selectedLink} offsetX='-0.5rem' style={{position: 'absolute', bottom: 0, right: '-2.8rem'}}>
          <IconButton
            isRound
            variant='solid'
            bg='primary'
            // color='white'
            aria-label='submit button'
            icon={<BsCheck2 />}
            onClick={async () => {
              if (selectedLink) {
                _onClose && _onClose();
                onSubmit && onSubmit(selectedLink);
              }
            }}
          />
        </SlideFade>
      </PopoverContent>
    </Portal>
  </Popover>;
}, () => true);

export function CytoReactLinksCardInsertNode({
  insertingLink, setInsertingLink,
  ml, ehRef, returningRef, insertLinkRef,
}: IInsertedLinkProps) {
  const [search, setSearch] = useState('');
  const deep = useDeep();
  const [insertingCyto, setInsertingCyto] = useInsertingCytoStore();
  const [container, setContainer] = useContainer();
  const [spaceId, setSpaceId] = useSpaceId();
  const { data: Finder } = useDeepId('@deep-foundation/finder', 'Finder');

  const [selectedLink, setSelectedLink] = useState<Link<number>>();

  return <>
    {!!Finder && <ClientHandler
      linkId={spaceId} context={[ Finder ]} ml={deep.minilinks}
      onChange={l => setSelectedLink(l)}
      {...(insertingLink?.props ? insertingLink?.props : { search: '' })}
    />}
    <SlideFade in={!!selectedLink} offsetX='-0.5rem' style={{position: 'absolute', bottom: 0, right: '-2.8rem'}}>
      <IconButton
        isRound
        variant='solid'
        bg='primary'
        // color='white'
        aria-label='submit button'
        icon={<BsCheck2 />}
        onClick={async () => {
          if (selectedLink) {
            deep.minilinks.apply((await deep.select({ down: { link_id: { _in: [selectedLink.id, selectedLink.from_id, selectedLink.to_id] } } }))?.data, 'CytoReactLinksCardInsertNode')
            if (insertingLink?.alterResolve) insertingLink?.alterResolve(deep.minilinks.byId[selectedLink.id]);
            setInsertingCyto({});
            if (!insertingLink?.alterResolve) returningRef?.current.startInsertingOfType(selectedLink.id, selectedLink.from_id, selectedLink.to_id);
            setInsertingLink(undefined);
          }
        }}
      />
    </SlideFade>
  </>;
  // return <CytoReactLinksCard
  //   elements={elements.filter(el => (!!el?.linkName?.includes && el?.linkName?.toLocaleLowerCase()?.includes(search) || el?.containerName?.includes && el?.containerName?.toLocaleLowerCase()?.includes(search)))}
  //   search={search}
  //   onSearch={e => setSearch(e.target.value)}
  //   onSubmit={async (id) => {
  //     const insertable = ml.links.filter(l => l._applies.includes('insertable-types'));
  //     const type = insertable?.find(t => t.id === id);
  //     const isNode = !type.from_id && !type.to_id;
  //     setInsertingCyto({});
  //     returningRef?.current.startInsertingOfType(id, type.from_id, type.to_id);
  //     setInsertingLink(undefined);
  //   }}
  // />;
};

export function useLinkInserting(elements = [], reactElements = [], focus, cyRef, ehRef) {
  const [insertingLink, setInsertingLink] = useState<IInsertedLink>();
  const [updatingLink, setUpdatingLink] = useState<IInsertedLink>();
  const [container, setContainer] = useContainer();
  const containerRef = useRefAutofill(container);
  const [spaceId, setSpaceId] = useSpaceId();
  const spaceIdRef = useRefAutofill(spaceId);
  const deep = useDeep();
  const deepRef = useRefAutofill(deep);
  const [insertingCyto, setInsertingCyto] = useInsertingCytoStore();
  const [updatingCyto, setUpdatingCyto] = useUpdatingCytoStore();
  const insertingCytoRef = useRefAutofill(insertingCyto);
  const updatingCytoRef = useRefAutofill(updatingCyto);
  const toast = useToast();
  const ml = deep.minilinks;

  useHotkeys('esc', e => {
    e.preventDefault();
    e.stopPropagation();
    if (insertingCyto?.type_id) {
      setInsertingCyto(undefined);
    }
  }, { enableOnFormTags: ["TEXTAREA", "INPUT"] });

  const types = useMinilinksFilter(
    ml,
    useCallback(() => true, []),
    useCallback((l, ml) => (ml.links.filter(l => l._applies.includes('insertable-types'))), []),
  ) || [];

  const [autoFocus, setAutoFocus] = useAutoFocusOnInsert();
  const autoFocusRef = useRefAutofill(autoFocus);

  const insertLink = useCallback(async (type_id, from, to, position: any) => {
    const loadedLink = types?.find(t => t.id === type_id);
    const valued = loadedLink?.valued?.[0]?.to_id;
    const inArray = [];
    if (position && autoFocusRef.current && !from && !to) {
      console.log('insertLink2', type_id, from, to, position, autoFocusRef.current);
      inArray.push({
        from_id: spaceIdRef.current,
        type_id: deep.idLocal('@deep-foundation/core', 'Focus'),
        object: { data: { value: position } },
        ...(containerRef.current ? { in: { data: {
          type_id: deep.idLocal('@deep-foundation/core', 'Contain'),
          from_id: containerRef.current
        } } } : {}),
      });
    }
    if (container && type_id !== deep.idLocal('@deep-foundation/core', 'Contain')) {
      inArray.push({
        from_id: container,
        type_id: deep.idLocal('@deep-foundation/core', 'Contain'),
      });
    }
    const { data: [{ id: linkId }] } = await deep.insert({
      type_id: type_id,
      ...(valued === deep.idLocal('@deep-foundation/core', 'String') ? { string: { data: { value: '' } } } :
        valued === deep.idLocal('@deep-foundation/core', 'Number') ? { number: { data: { value: 0 } } } :
        valued === deep.idLocal('@deep-foundation/core', 'Object') ? { object: { data: { value: {} } } } :
        {}),
      ...(!!inArray.length ? { in: { data: inArray } } : {}),
      from_id: from || 0,
      to_id: to || 0,
    });

    // setInsertingLink((insertLink) => {
    //   if (!from && !to && !!insertLink) focus(linkId, insertLink.position);
    //   return undefined;
    // })
  }, [cyRef.current, types, container, deep.linkId]);
  const insertLinkRef = useRefAutofill(insertLink);

  const updateLink = useCallback(async (id, from, to, position: any) => {
    const { data: [{ id: linkId }] } = await deep.update(id, {
      from_id: from || 0,
      to_id: to || 0,
    });
  }, [cyRef.current, types, container, deep.linkId]);
  const updateLinkRef = useRefAutofill(updateLink);

  const TempComponent = useMemo(() => {
    return () => <CytoReactLinksCardInsertNode
      insertingLink={insertingLink}
      setInsertingLink={setInsertingLink}
      ml={ml}
      ehRef={ehRef}
      returningRef={returningRef}
      insertLinkRef={insertLinkRef}
    />;
  }, [insertingLink]);
  if (insertingLink) {
    const element = {
      id: 'insert-link-card',
      position: insertingLink.position,
      locked: true,
      classes: 'insert-link-card',
      data: {
        id: 'insert-link-card',
        Component: TempComponent,
      },
    };
    elements.push(element);
    reactElements.push(element);
  }

  useHotkeys('esc', () => {
    if (insertingCytoRef?.current?.type_id) setInsertingCyto({});
    ehRef?.current?.disableDrawMode();
    cyRef.current?.$('.eh-ghost,.eh-preview')?.remove();
  });

  const returning = {
    openSearchCard: (searchLink: IInsertedLink) => {
      if (searchLink) {
        setInsertingLink(searchLink);
        if (cyRef.current) {
          const el = cyRef.current.$('#insert-link-card');
          el.unlock();
          if (!searchLink.from && !searchLink.to) {
            el.position(searchLink.position);
            el.lock();
          }
        }
      } else {
        setInsertingLink(undefined);
      }
    },
    insertLink,
    openInsertCard: (insertedLink: IInsertedLink) => {
      if (insertedLink) {
        setInsertingLink(insertedLink);
        if (cyRef.current) {
          const el = cyRef.current.$('#insert-link-card');
          el.unlock();
          if (!insertedLink.from && !insertedLink.to) {
            el.position(insertedLink.position);
            el.lock();
          }
        }
      } else {
        setInsertingLink(undefined);
      }
    },
    insertingCytoRef,
    insertingCyto,
    startUpdatingLink: (id: number) => {
      const link = ml.byId[id];
      const linkName = link?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || link?.id;
      const Type = link.type;
      const TypeName = Type?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || Type?.id;
      const FromName = ml.byId[Type.from_id]?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || Type.from_id;
      const ToName = ml.byId[Type.to_id]?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || Type.to_id;
      const t = toast({
        title: `Updating link: ${linkName} type of: ${TypeName}`,
        position: 'bottom-left',
        duration: null,
        icon: <Spinner />,
        isClosable: true,
        onCloseComplete: () => {
          if (updatingCytoRef?.current?.id) setUpdatingCyto({});
          ehRef?.current?.disableDrawMode();
          cyRef.current?.$('.eh-ghost,.eh-preview')?.remove();
        },
      });
      ehRef?.current?.enableDrawMode();
      setUpdatingLink(undefined);
      setUpdatingCyto({ id, toast: t });
    },
    startInsertingOfType: (id: number, From: number, To: number) => {
      const link = ml.byId[id];
      const isNode = !From && !To;
      const isPossibleNode = isNode || (From === To && From === deep.idLocal('@deep-foundation/core', 'Any'));
      const TypeName = link?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || link?.id;
      const FromName = ml.byId[From]?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || From;
      const ToName = ml.byId[To]?.inByType?.[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || To;
      const t = toast({
        title: `Inserting link type of: ${TypeName}`,
        description: `This ${isNode ? `is node type, just click somewhere for insert.` : `is link type, connect two links from typeof ${FromName} to typeof ${ToName} for insert.`}`,
        position: 'bottom-left',
        duration: null,
        icon: <Spinner />,
        isClosable: true,
        onCloseComplete: () => {
          if (insertingCytoRef?.current?.type_id) setInsertingCyto({});
          ehRef?.current?.disableDrawMode();
          cyRef.current?.$('.eh-ghost,.eh-preview')?.remove();
        },
      });
      if (!isNode) {
        ehRef?.current?.enableDrawMode();
      }
      setInsertingLink(undefined);
      setInsertingCyto({ isNode, isPossibleNode, type_id: id, toast: t, From, To });
    },
    drawendInserting: (position, from, to) => {
      const ins = insertingCytoRef.current;
      setInsertingCyto({});
      toast.close(ins.toast);
      ehRef?.current?.disableDrawMode();
      cyRef.current.$('.eh-ghost,.eh-preview').remove();
      if (ins.type_id) {
        insertLinkRef.current(ins.type_id, +from, +to, position);
      } else {
        returning.openInsertCard({
          position, from, to
        });
      }
    },
    drawendUpdating: (position, from, to) => {
      const upd = updatingCytoRef.current;
      setUpdatingCyto({});
      toast.close(upd.toast);
      ehRef?.current?.disableDrawMode();
      cyRef.current.$('.eh-ghost,.eh-preview').remove();
      updateLinkRef.current(upd.id, +from, +to, position);
    },
  };
  const returningRef = useRefAutofill(returning);

  const cyHandledRef = useRef(false);
  useEffect(() => {
    if (!cyRef.current || cyHandledRef.current) return;
    cyHandledRef.current = true;
    const ehstop = async (event, sourceNode, targetNode, addedEdge) => {
      let { position } = event;
      addedEdge?.remove();
      ehRef?.current?.disableDrawMode();
      if (insertingCytoRef.current.type_id) {
        const ins = insertingCytoRef.current;
        if (sourceNode?.id() && !targetNode?.id() && ins._selfLink !== false) {
          ins.from = +sourceNode?.id();
          ins.to = +targetNode?.id();
          ins._selfLink = true;
          setInsertingCyto({ ...ins, from: +sourceNode?.id(), to: +sourceNode?.id(), _selfLink: true });
        } else {
          setInsertingCyto({});
        }
        toast.close(ins.toast);
      } else if (updatingCytoRef.current.id) {
        const upd = updatingCytoRef.current;
        if (sourceNode?.id() && !targetNode?.id() && upd._selfLink !== false) {
          upd.from = +sourceNode?.id();
          upd.to = +targetNode?.id();
          if (sourceNode?.id() === updatingCytoRef.current.id) {
            upd._selfLink = true;
            setUpdatingCyto({ ...upd, from: 0, to: 0, _selfLink: true });
          } else {
            returning.drawendUpdating(position, upd.from, upd.from);
          }
        }
        toast.close(upd.toast);
      }
    };
    const ehcomplete = async (event, sourceNode, targetNode, addedEdge) => {
      let { position } = event;
      if (insertingCytoRef.current.type_id) {
        insertingCytoRef.current._selfLink = false;
        addedEdge?.remove();
        const from = sourceNode?.data('link')?.id;
        const to = targetNode?.data('link')?.id;
        if (from && to) returning.drawendInserting(position, from, to);
      } else if (updatingCytoRef.current.id) {
        updatingCytoRef.current._selfLink = false;
        addedEdge?.remove();
        const from = sourceNode?.data('link')?.id;
        const to = targetNode?.data('link')?.id;
        if (from && to) returning.drawendUpdating(position, from, to);
      }
    };
    const tap = async function(event){
      ehRef?.current?.disableDrawMode();
      setInsertingLink(undefined);
      if (insertingCytoRef.current.type_id) {
        const ins = insertingCytoRef.current;
        setInsertingCyto({});
        toast.close(ins.toast);
        if(event.target === cyRef.current){
          if (ins.type_id) {
            if (ins.isPossibleNode) {
              await returningRef.current.insertLink(ins.type_id, 0, 0, event.position);
              // await deepRef.current.insert({
              //   type_id: ins.type_id,
              //   in: { data: [
              //     {
              //       from_id: containerRef.current,
              //       type_id: deep.idLocal('@deep-foundation/core', 'Contain'),
              //     },
              //     {
              //       from_id: containerRef.current,
              //       type_id: deep.idLocal('@deep-foundation/core', 'Focus'),
              //       object: { data: { value: event.position } },
              //       in: { data: {
              //         type_id: deep.idLocal('@deep-foundation/core', 'Contain'),
              //         from_id: containerRef.current
              //       } },
              //     },
              //   ] },
              // });
              toast.close(ins.toast);
              setInsertingCyto({});
            } else {
              const Any = deep.idLocal('@deep-foundation/core', 'Any');
              if (ins.From === Any && ins.To === Any) {
                // @ts-ignore
                await returningRef.current.insertLink(ins.type_id, 0, 0, ins?.position);
              }
              setInsertingCyto({});
            }
          }
          returningRef.current?.openInsertCard(undefined);
        }
      }
    };
    cyRef.current.on('ehstop', ehstop);
    cyRef.current.on('ehcomplete', ehcomplete);
    cyRef.current.on('tap', tap);
    return () => {
      if (!cyRef.current) return;
      cyRef.current.removeListener('ehstop', ehstop);
      cyRef.current.removeListener('ehcomplete', ehcomplete);
      cyRef.current.removeListener('tap', tap);
    };
  }, [cyRef.current]);

  return returning;
}

export function useLinkReactElements(elements = [], reactElements = [], cy, ml, spaceId) {
  const deep = useDeep();
  const [linkReactElements, setLinkReactElements] = useState<{ [key: string]: boolean }>({});
  const linkReactElementsIds = useMemo(() => Object.keys(linkReactElements).filter(key => !!linkReactElements[key]), [linkReactElements]).map(key => parseInt(key), [linkReactElements]);

  reactElements.push(...linkReactElementsIds.map(id => (elements.find(e => e.id === id))).filter(i => !!i));

  const cyRef = useRefAutofill(cy);
  const { open, close, isOpened } = useOpenedMethods();
  const { data: Opened } = useDeepId('@deep-foundation/deepcase-opened', 'Opened');

  reactElements.push(...((deep.minilinks?.byId?.[spaceId]?.outByType?.[Opened] || [])?.map(l => elements.find(e => e.id === l.to_id))).filter(i => !!i));

  useEffect(() => {
    if (cy && Opened) {
      const opened = cy?.$(`.deepcase-opened`);
      opened.forEach(o => {
        const isMustBeOpen = !!reactElements?.find(e => e === +o.id());
        if (!isMustBeOpen) {
          cy?.$(`#${o.id()}`).data('Component', undefined);
          cy?.$(`#${o.id()}`).removeClass('unhoverable');
          cy?.$(`#${o.id()}`).removeClass('deepcase-opened');
        }
      });
      reactElements?.forEach(el => {
        const isOpened = cy?.$(`#${el.id}.deepcase-opened`);
        if (!isOpened?.length) {
          cy?.$(`#${el.id}`).data('Component', AnyLinkComponent);
          cy?.$(`#${el.id}`).addClass('unhoverable').removeClass('hover');
          cy?.$(`#${el.id}`).addClass('deepcase-opened');
        }
      });
    }
  }, [reactElements, Opened]);

  const toggleLinkReactElement = async (id: number) => {
    const cy = cyRef.current;
    // const isEnabling = !linkReactElements[id];
    // if (isEnabling) {
    //   cy?.$(`#${id}`).data('Component', AnyLinkComponent);
    //   cy?.$(`#${id}`).addClass('unhoverable').removeClass('hover');
    //   // cy?.$(`#${id}`).style({
    //   //   'shape': 'rectangle',
    //   //   'background-opacity': '0',
    //   // });
    // } else {
    //   cy?.$(`#${id}`).data('Component', undefined);
    //   cy?.$(`#${id}`).removeClass('unhoverable');
    //   // cy?.$(`#${id}`).style({
    //   //   'shape': null,
    //   //   width: null,
    //   //   height: null,
    //   //   'background-opacity': null,
    //   //   'border-width': 0,
    //   // });
    // }
    if (isOpened(id)) {
      await close(id);
    } else {
      const { data: handler } = await deep.select({
        type_id: deep.idLocal('@deep-foundation/core', 'HandleClient'),
        from: {
          down: {
            tree_id: { _eq: deep.idLocal('@deep-foundation/core', 'typesTree') },
            link_id: { _eq: id },
          },
        }
      });
      const handlerId = handler?.[0]?.to_id;
      if (handlerId) {
        await open(id, handlerId);
      }
    }
  };

  const AnyLinkComponent = useMemo(() => {
    return function AnyLinkComponent({ id }: { id: number }) {
      const [linkId, setLinkId] = useState(id);
      const deep = useDeep();
      const [handlerId, setHandlerId] = useState();
      const { onOpen, onClose, isOpen } = useDisclosure();
      const [search, setSearch] = useState('');
      const [spaceId] = useSpaceId();

      const { data: handleClients } = deep.useDeepSubscription({
        type_id: deep.idLocal('@deep-foundation/core', 'HandleClient'),
        from: {
          down: {
            tree_id: { _eq: deep.idLocal('@deep-foundation/core', 'typesTree') },
            link_id: { _eq: linkId },
          },
        }
      });

      const { data: Opened } = useDeepId('@deep-foundation/deepcase-opened', 'Opened');
      const { data: OpenedHandler } = useDeepId('@deep-foundation/deepcase-opened', 'OpenedHandler');

      const openedHandlers = deep.useMinilinksSubscription({
        type_id: OpenedHandler || 0,
        from: {
          type_id: Opened || 0,
          from_id: spaceId,
          to_id: linkId,
        },
      });
      const [openedHandler] = openedHandlers;
      useEffect(() => {
        setHandlerId(undefined);
      }, [linkId]);
      useEffect(() => {
        if (openedHandler?.to_id && openedHandler?.to_id !== handlerId) setHandlerId(openedHandler?.to_id);
        if (!handlerId) {
          const inheritance = [];
          for (let pointer = deep.minilinks.byId[linkId]; !!pointer && inheritance[inheritance.length - 1] !== pointer; pointer = pointer?.type) {
            inheritance.push(pointer);
            const handleClient: any = handleClients.find(h => h.from_id === pointer.id);
            if (handleClient) {
              setHandlerId(handleClient?.to_id);
              break;
            }
          }
        }
      }, [handleClients, openedHandlers]);

      const handleClient = handleClients.find(h => h.to_id === handlerId);
      const elements = handleClients?.map(t => ({
        id: t?.to_id,
        src:  deep.minilinks.byId?.[t?.to_id]?.inByType[deep.idLocal('@deep-foundation/core', 'Symbol')]?.[0]?.value?.value || t.id,
        linkName: deep.minilinks.byId?.[t?.to_id]?.inByType[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.value?.value || t.id,
        containerName: deep.minilinks.byId?.[t?.to_id]?.inByType[deep.idLocal('@deep-foundation/core', 'Contain')]?.[0]?.from?.value?.value || '',
      })) || [];

      const onCloseCard = useCallback(() => toggleLinkReactElement(linkId), [linkId]);
      return <div>
        <CatchErrors errorRenderer={(error, reset) => {
          return <div>{String(error)}</div>;
        }}>
          <Flex mb='0.25rem' minW='7rem'>
            <Popover
              isLazy
              isOpen={isOpen}
              onOpen={onOpen}
              onClose={onClose}
              placement='right-start'
            >
              <PopoverTrigger>
                <IconButton 
                  aria-label='replay to message button'
                  isRound
                  bg='whiteGray'
                  borderColor='borderColor'
                  borderWidth='thin'
                  size={'xs'}
                  sx={{
                    marginRight: '0.5rem',
                    _hover: {
                      transform: 'scale(1.2)',
                    }
                  }}
                  icon={<VscVersions />}
                />
              </PopoverTrigger>
              <PopoverContent h={72}>
                <CytoReactLinksCard
                  selectedLinkId={handlerId}
                  elements={elements.filter(el => (!!el?.linkName?.includes && el?.linkName?.toLocaleLowerCase()?.includes(search) || el?.containerName?.includes && el?.containerName?.toLocaleLowerCase()?.includes(search)))}
                  search={search}
                  onSearch={e => setSearch(e.target.value)}
                  onSubmit={async (hid) => {
                    open(linkId, hid);
                    onClose();
                  }}
                  fillSize
                />
              </PopoverContent>
            </Popover>
            <IconButton
              isRound
              aria-label='open new full tab'
              size={'xs'}
              as='a'
              bg='whiteGray'
              borderColor='borderColor'
              borderWidth='thin'
              target='_blank'
              href={`/client-handler?props=%7B"linkId"%3A${linkId}%2C"handlerId"%3A${handlerId}%7D`}
              sx={{
                _hover: {
                  transform: 'scale(1.2)',
                }
              }}
              icon={<BsArrowsFullscreen />}
            />
            <Spacer />
            <IconButton
              isRound
              aria-label='close client handler'
              size={'xs'}
              bg='whiteGray'
              borderColor='borderColor'
              borderWidth='thin'
              sx={{
                _hover: {
                  transform: 'scale(1.2)',
                }
              }}
              icon={<VscChromeClose />}
              onClick={onCloseCard}
            />
          </Flex>
          {!handleClient?.to_id && <Alert status='error'><AlertIcon />Compatible HandleClient not found.</Alert>}
          {!!handleClient?.to_id && [<ClientHandler key={`${linkId}${handleClient?.to_id}`} handlerId={handleClient?.to_id} linkId={linkId} ml={ml} onClose={onCloseCard} setLinkId={setLinkId} setHandlerId={setHandlerId}/>]}
        </CatchErrors>
      </div>;
    };
  }, [cy]);

  return {
    toggleLinkReactElement,
    linkReactElements: linkReactElementsIds,
  };
}

export function useCytoEditor() {
  return useQueryStore('cyto-editor', false);
}

export function useCyInitializer({
  elementsRef,
  elements,
  reactElements,
  cyRef,
  setCy,
  ehRef,
  cytoViewportRef,
  rootRef,
  useSpaceId: _useSpaceId = useSpaceId,
}: {
  elementsRef: any;
  elements: any;
  reactElements: any;
  cyRef: any;
  setCy: any;
  ehRef: any;
  cytoViewportRef: any;
  rootRef?: any;
  useSpaceId?: any;
}) {
  const deep = useDeep();
  const { layout, setLayout } = useLayout();
  const [extra, setExtra] = useShowExtra();
  const [spaceId, setSpaceId] = _useSpaceId();
  const [container, setContainer] = useContainer();
  const [showTypes, setShowTypes] = useShowTypes();
  const [cytoEditor, setCytoEditor] = useCytoEditor();
  const [autoFocus, setAutoFocus] = useAutoFocusOnInsert();
  const autoFocusRef = useRefAutofill(autoFocus);
  const containerRef = useRefAutofill(container);
  const ml = deep.minilinks;
  const spaceIdRef = useRefAutofill(spaceId);
  const deepRef = useRefAutofill(deep);

  const {
    addTab,
    activeTab,
  } = useEditorTabs();

  const refDragStartedEvent = useRef<any>();

  const { toggleLinkReactElement } = useLinkReactElements(elements, reactElements, cyRef.current, ml, spaceId);


  // const relayout = useCallback(() => {
  //   if (cyRef.current && cyRef.current.elements) {
  //     const elements = cyRef.current.elements();
  //     try {
  //       elements.layout(layout(elementsRef.current, cyRef.current)).run();
  //     } catch(error) {
  //       console.log('relayout error', error);
  //     }
  //   }
  // }, [cyRef.current, layout]);
  // const relayoutDebounced = useDebounceCallback(relayout, 500);
  // const globalAny:any = global;
  // globalAny.relayoutDebounced = relayoutDebounced;


  // const globalAny:any = global;
  // globalAny.relayoutDebounced = relayoutDebounced;


  const { focus, unfocus, lockingRef } = useCytoFocusMethods(cyRef.current);
  const { startInsertingOfType, startUpdatingLink, openInsertCard, insertLink, drawendInserting, insertingCyto, insertingCytoRef } = useLinkInserting(elements, reactElements, focus, cyRef, ehRef);

  const onLoaded = (ncy) => {
    const locking = lockingRef.current;

    // ncy.use(cytoscapeLasso);

    let eh = ehRef.current = ncy.edgehandles({
      // canConnect: function( sourceNode, targetNode ){
      //   // whether an edge can be created between source and target
      //   return !sourceNode.same(targetNode); // e.g. disallow loops
      // },
      // edgeParams: function( sourceNode, targetNode ){
      //   // for edges between the specified source and target
      //   // return element object to be passed to cy.add() for edge
      //   return {};
      // },
      hoverDelay: 0, // time spent hovering over a target node before it is considered selected
      snap: true, // when enabled, the edge can be drawn by just moving close to a target node (can be confusing on compound graphs)
      snapThreshold: 0, // the target node must be less than or equal to this many pixels away from the cursor/finger
      snapFrequency: 15, // the number of times per second (Hz) that snap checks done (lower is less expensive)
      noEdgeEventsInDraw: true, // set events:no to edges during draws, prevents mouseouts on compounds
      disableBrowserGestures: true // during an edge drawing gesture, disable browser gestures such as two-finger trackpad swipe and pinch-to-zoom
    });
    const layoutstart = () => {
      // console.time('layout');
    };
    const layoutstop = () => {
      // console.timeEnd('layout');
    };
    const mouseover = function(e) {
      var node = e.target;
      if (!node.is(':parent')) {
        const id = node?.data('link')?.id;
        if (id) {
          ncy.$(`node, edge`).not(`#${id},#${id}-from,#${id}-to,#${id}-type`).removeClass('hover');
          ncy.$(`#${id},#${id}-from,#${id}-to,#${id}-type`).not(`.unhoverable`).addClass('hover');
        }
        if (node.locked()) {
          node.mouseHoverDragging = true;
        }
      }
    };
    const mouseout = function(e) {
      var node = e.target;
      if (!node.is(':parent')) {
        const id = node?.data('link')?.id;
        if (id) {
          ncy.$(`node, edge`).removeClass('hover');
        }
        if (node.mouseHoverDragging) {
          node.mouseHoverDragging = false;
        }
      }
    };
    const click = function(e) {
      var node = e.target;
      const id = node?.data('link')?.id;
      if (id) {
        toggleLinkReactElement(id);
      }
    };
    const tapstart = function(evt){
      var node = evt.target;
      refDragStartedEvent.current = evt;
      node.mouseHoverDragging = true;
    };
    let dragendData: any = undefined;
    const tapend = function(evt){
      var node = evt.target;
      refDragStartedEvent.current = undefined;
      dragendData = { position: evt.position };
      evt.target.emit('dragend');
    };
    const dragend = async function(evt){
      var node = evt.target;
      const id = node?.data('link')?.id;
      const ins = insertingCytoRef.current;
      if (ins?.from && !ins?.to && ins._selfLink) {
        await deep.insert({
          type_id: ins.type_id,
          from_id: ins?.from,
          to_id: ins?.from,
          in: { data: [
            {
              from_id: containerRef.current,
              type_id: deep.idLocal('@deep-foundation/core', 'Contain'),
            },
          ] },
        });
      } else if (id) {
        focus(node, dragendData?.position);
        dragendData = undefined;
        ncy.$(`#${id},#${id}-from,#${id}-to,#${id}-type`).addClass('focused');
        // if (node.mouseHoverDragging) {
          // node.mouseHoverDragging = false;
        // }
      }
    };

    let r = -70;
    let rStep = 33;
    const nodeMenu = ncy.cxtmenu({
      selector: '.link-node',
      menuRadius: function(ele){ return 108; },
      outsideMenuCancel: 10,
      openMenuEvents: 'cxttapstart taphold ctxmenu-nodeMenu-open',
      closeMenuEvents: 'ctxmenu-nodeMenu-close',
      activeFillColor: 'rgba(0, 128, 255, 0.75)', // the colour used to indicate the selected command
      activePadding: 2, // additional size in pixels for the active command
      indicatorSize: 16, // the size in pixels of the pointer to the active command, will default to the node size if the node size is smaller than the indicator size, 
      separatorWidth: 3, // the empty spacing in pixels between successive commands
      spotlightPadding: 3, // extra spacing in pixels between the element and the spotlight
      adaptativeNodeSpotlightRadius: true,
      commands: [
        {
          content: 'editor',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+((r = r - rStep) - 180)+'deg)' },
          select: function(ele){
            const id = ele.data('link')?.id;
            if (id) {
              addTab({
                id, saved: true,
                initialValue: deep.stringify(ml.byId[id]?.value?.value),
              });
              activeTab(id);
              setCytoEditor(true);
            }
          }
        },
        {
          content: 'unlock',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+((r = r - rStep) - 180)+'deg)' },
          select: async function(ele){
            const id = ele.data('link')?.id;
            if (id) {
              await unfocus(ele);
              ncy.$(`#${id},#${id}-from,#${id}-to,#${id}-type`).removeClass('focused');
            }
          }
        },
        {
          content: 'delete',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+((r = r - rStep) - 180)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              if (confirm(`Are you shure whant to delete this link?`)) {
                await deep.delete(+id);
              }
            }
          }
        },
        {
          content: 'delete down',
          contentStyle: { fontSize: '0.7rem', transform: 'rotate('+((r = r - rStep) - 180)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              if (confirm(`Are you shure whant to delete all links down by contain tree?`)) {
                await deep.delete({
                  up: {
                    tree_id: { _eq: deep.idLocal('@deep-foundation/core', 'containTree') },
                    parent_id: { _eq: +id },
                  },
                });
              }
            }
          }
        },
        {
          ncy,
          setCy,
          content: 'insert',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+((r = r - rStep) - 180)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              startInsertingOfType(id, 0, 0);
            }
          }
        },
        {
          content: 'update',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+(r = r - rStep)+'deg)' },
          select: async function(ele) {
            const id = ele.data('link')?.id;
            if (id) {
              startUpdatingLink(id);
            }
          },
        },
        {
          content: 'login',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+(r = r - rStep)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              const { linkId } = await deep.login({ linkId: +id });
              if (linkId) {
                setSpaceId(+id);
                setContainer(+id);
              }
            }
          }
        },
        {
          content: 'space',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+(r = r - rStep)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              setSpaceId(+id);
              setContainer(+id);
            }
          }
        },
        {
          content: 'container',
          contentStyle: { fontSize: '0.9rem', transform: 'rotate('+(r = r - rStep)+'deg)' },
          select: async function(ele){ 
            const id = ele.data('link')?.id;
            if (id) {
              setContainer(+id);
            }
          }
        },
        {
          content: (ele) => `traveler (${traveler.findTravlers(undefined, ele.data('link')?.id)?.length || 0})`,
          contentStyle: { fontSize: '0.6rem', transform: 'rotate('+(r = r - rStep)+'deg)', paddingLeft: '6px' },
          select: async function(ele){
            const id = ele.data('link')?.id;
            if (id) {
              await delay(60);
              ele.emit('ctxmenu-nodeMenu-close');
              await delay(60);
              ele.emit('ctxmenu-travelerMenu-open');
            }
          }
        },
        {
          content: (ele) => `readme`,
          contentStyle: { fontSize: '0.6rem', transform: 'rotate('+(r = r - rStep)+'deg)', paddingLeft: '6px' },
          select: async function(ele){
            
          }
        },
      ]
    });

    const traveler = initializeTraveler(ncy, deepRef, spaceIdRef);
  
    const bodyMenu = ncy.cxtmenu({
      selector: 'core',
      outsideMenuCancel: 10,
      commands: [
        {
          content: 'insert',
          select: function(el, ev){
            setTimeout(()=>{
              openInsertCard({
                position: ev.position, from: 0, to: 0,
                props: { query: `{ type_id: { _id: ['@deep-foundadtion/core', 'Package'] } }` },
              });
            },1);
          }
        },
        {
          content: 'center',
          select: function(el, ev){
            ncy.pan({ x: rootRef?.current.clientWidth / 2, y: rootRef?.current.clientHeight / 2 });
            ncy.zoom(1);
          }
        },
        {
          content: 'query',
          select: function(el, ev){
            openInsertCard({
              position: ev.position, from: 0, to: 0,
              alterResolve: async (link) => {
                deep.insert({
                  type_id: await deep.id('@deep-foundation/deepcase', 'Traveler'),
                  from_id: link?.id,
                  in: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'Contain'),
                    from_id: spaceId,
                  } },
                  to: { data: {
                    type_id: await deep.id('@deep-foundation/core', 'Query'),
                    object: { data: { value: { id: link?.id } } },
                    in: { data: [
                      {
                        type_id: await deep.id('@deep-foundation/core', 'Contain'),
                        from_id: spaceId,
                      },
                      {
                        type_id: await deep.id('@deep-foundation/core', 'Active'),
                        from_id: spaceId,
                        in: { data: {
                          type_id: await deep.id('@deep-foundation/core', 'Contain'),
                          from_id: spaceId,
                        } },
                      },
                    ] },
                  } },
                });
                if (autoFocusRef.current) focus(link?.id, ev?.position);
              },
            });
          }
        },
      ]
    });

    // edgehandles bug fix, clear previous edgehandles
    const cxttapstart = async function(event){
      ncy.$('.eh-ghost,.eh-preview').remove();
    };

    const updatedListener = (oldLink, newLink) => {
      // // on update link or link value - unlock reposition lock
      // if (
      //   newLink.type_id === deep.idLocal('@deep-foundation/core', 'Focus') && newLink?.value?.value?.x &&
        
      //   // if true - we remember how WE lock it, ok, we have updatefrom db...
      //   // if undefined - we not know lock/not lock... just update from db...
      //   // if false - we must stop update from db, we already unlock it on client, and not need to update focus from db... it mistake
      //   // this line - fix it
      //   locking[newLink.to_id] !== false
      // ) {
      //   const node = ncy.$(`node#${newLink.to_id}`);
      //   if (!node.mouseHoverDragging) {
      //     node.unlock();
      //     // node.position(newLink?.value?.value);
      //     node.lock();
      //   }
      // }
    };

    const viewport = (event) => {
      cytoViewportRef?.current?.setValue({ pan: ncy.pan(), zoom: ncy.zoom() });
    }

    ncy.on('cxttapstart', cxttapstart);
    ncy.on('dragend', 'node', dragend);
    ncy.on('tapend', 'node', tapend);
    ncy.on('tapstart', 'node', tapstart);
    ncy.on('click', '.link-node, .link', click);
    ncy.on('mouseout', '.link-from, .link-to, .link-type, .link-node', mouseout);
    ncy.on('mouseover', '.link-from, .link-to, .link-type, .link-node', mouseover);
    ncy.on('layoutstart', layoutstart);
    ncy.on('layoutstop', layoutstop);
    ncy.on('viewport', viewport);

    ml.emitter.on('updated', updatedListener);
    // ncy.lassoSelectionEnabled(true);

    setCy(ncy);

    return () => {
      ncy.removeListener('cxttapstart', cxttapstart);
      ncy.removeListener('dragend', 'node', dragend);
      ncy.removeListener('tapend', 'node', tapend);
      ncy.removeListener('tapstart', 'node', tapstart);
      ncy.removeListener('click', '.link-from, .link-to, .link-type, .link-node', click);
      ncy.removeListener('mouseout', '.link-from, .link-to, .link-type, .link-node', mouseout);
      ncy.removeListener('mouseover', '.link-from, .link-to, .link-type, .link-node', mouseover);
      ncy.removeListener('layoutstart', layoutstart);
      ncy.removeListener('layoutstop', layoutstop);
      ncy.removeListener('viewport', viewport);
      
      ml.emitter.removeListener('updated', updatedListener);

      nodeMenu.destroy();
      bodyMenu.destroy();
      traveler.destroy();
    };
  };
  return {
    onLoaded,
  };
}

export function useCytoHandlersRules() {
  return useQueryStore('ch-rules', {});
};
